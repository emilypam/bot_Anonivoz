import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getBotUsage() {
    const now = new Date();
    const last7 = new Date(now.getTime() - 7 * 86_400_000);
    const last30 = new Date(now.getTime() - 30 * 86_400_000);

    const [
      totalStarts,
      totalReportStarts,
      totalReportCompleted,
      totalReportAbandoned,
      totalSupportSessions,
      uniqueUsersAll,
      uniqueUsers7,
      uniqueUsers30,
      timelineEvents,
      institutionEvents,
      institutions,
    ] = await Promise.all([
      this.prisma.botEvent.count({ where: { eventType: 'BOT_START' } }),
      this.prisma.botEvent.count({ where: { eventType: 'REPORT_STARTED' } }),
      this.prisma.botEvent.count({ where: { eventType: 'REPORT_COMPLETED' } }),
      this.prisma.botEvent.count({ where: { eventType: 'REPORT_ABANDONED' } }),
      this.prisma.botEvent.count({ where: { eventType: 'SUPPORT_STARTED' } }),

      this.prisma.botEvent.groupBy({
        by: ['telegramUserId'],
        where: { eventType: 'BOT_START' },
      }),
      this.prisma.botEvent.groupBy({
        by: ['telegramUserId'],
        where: { eventType: 'BOT_START', createdAt: { gte: last7 } },
      }),
      this.prisma.botEvent.groupBy({
        by: ['telegramUserId'],
        where: { eventType: 'BOT_START', createdAt: { gte: last30 } },
      }),

      this.prisma.botEvent.findMany({
        where: {
          createdAt: { gte: last30 },
          eventType: {
            in: [
              'BOT_START',
              'REPORT_STARTED',
              'REPORT_COMPLETED',
            ],
          },
        },
        select: { eventType: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),

      this.prisma.botEvent.groupBy({
        by: ['institutionId', 'eventType'],
        _count: { id: true },
        where: { institutionId: { not: null } },
      }),

      this.prisma.institution.findMany({ select: { id: true, name: true } }),
    ]);

    const completionRate =
      totalReportStarts > 0
        ? Math.round((totalReportCompleted / totalReportStarts) * 1000) / 10
        : 0;
    const abandonRate =
      totalReportStarts > 0
        ? Math.round((totalReportAbandoned / totalReportStarts) * 1000) / 10
        : 0;

    // Timeline — últimos 30 días
    const timelineMap: Record<string, { starts: number; reportStarts: number; reportCompleted: number }> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(last30.getTime() + i * 86_400_000);
      timelineMap[d.toISOString().slice(0, 10)] = { starts: 0, reportStarts: 0, reportCompleted: 0 };
    }
    for (const e of timelineEvents) {
      const key = e.createdAt.toISOString().slice(0, 10);
      if (!timelineMap[key]) continue;
      if (e.eventType === 'BOT_START') timelineMap[key].starts++;
      if (e.eventType === 'REPORT_STARTED') timelineMap[key].reportStarts++;
      if (e.eventType === 'REPORT_COMPLETED') timelineMap[key].reportCompleted++;
    }
    const timeline = Object.entries(timelineMap).map(([date, v]) => ({ date, ...v }));

    // Por institución
    type InstEntry = { name: string; starts: number; reportCompleted: number; reportAbandoned: number };
    const instMap: Record<string, InstEntry> = {};
    for (const inst of institutions) {
      instMap[inst.id] = { name: inst.name, starts: 0, reportCompleted: 0, reportAbandoned: 0 };
    }
    for (const ev of institutionEvents) {
      if (!ev.institutionId || !instMap[ev.institutionId]) continue;
      if (ev.eventType === 'BOT_START') instMap[ev.institutionId].starts += ev._count.id;
      if (ev.eventType === 'REPORT_COMPLETED') instMap[ev.institutionId].reportCompleted += ev._count.id;
      if (ev.eventType === 'REPORT_ABANDONED') instMap[ev.institutionId].reportAbandoned += ev._count.id;
    }
    const byInstitution = Object.entries(instMap).map(([institutionId, v]) => ({ institutionId, ...v }));

    return {
      totalUniqueUsers: uniqueUsersAll.length,
      usersLast7Days: uniqueUsers7.length,
      usersLast30Days: uniqueUsers30.length,
      totalStarts,
      totalReportStarts,
      totalReportCompleted,
      totalReportAbandoned,
      totalSupportSessions,
      completionRate,
      abandonRate,
      timeline,
      byInstitution,
    };
  }
}
