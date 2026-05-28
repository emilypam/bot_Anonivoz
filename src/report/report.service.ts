import { Injectable, NotFoundException } from '@nestjs/common';
import {
  HarassmentType,
  FrequencyLevel,
  IncidentDateApprox,
  InformantType,
  LocationTag,
  Priority,
  ReportStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

// Mapeo de las opciones en español del bot a los enums de la BD
const INFORMANT_MAP: Record<string, InformantType> = {
  'Víctima': 'VICTIM',
  'Testigo': 'WITNESS',
};

const HARASSMENT_MAP: Record<string, HarassmentType> = {
  'Físico': 'PHYSICAL',
  'Verbal': 'VERBAL',
  'Social/Exclusión': 'SOCIAL',
  'Ciberacoso': 'CYBERBULLYING',
};

const FREQUENCY_MAP: Record<string, FrequencyLevel> = {
  'Una sola vez': 'ONCE',
  'Semanalmente': 'WEEKLY',
  'Diariamente': 'DAILY',
};

const LOCATION_MAP: Record<string, LocationTag> = {
  'Salón de clases': 'CLASSROOM',
  'Recreo/Patios': 'RECESS',
  'Redes Sociales': 'SOCIAL_MEDIA',
  'Fuera de la escuela': 'OUTSIDE',
};

const DATE_MAP: Record<string, IncidentDateApprox> = {
  'Hoy': 'TODAY',
  'Ayer': 'YESTERDAY',
  'Esta semana': 'THIS_WEEK',
  'La semana pasada': 'LAST_WEEK',
  'Hace más de un mes': 'OVER_A_MONTH',
};

// Campos comunes que el panel DECE incluye en listados
const REPORT_LIST_INCLUDE = {
  incident: {
    select: {
      harassmentType: true,
      frequencyLevel: true,
      locationTag: true,
      incidentDateApprox: true,
    },
  },
  assignedTo: {
    select: { id: true, name: true, role: true },
  },
  _count: {
    select: { notes: true },
  },
};

// Campos completos para la vista de detalle
const REPORT_DETAIL_INCLUDE = {
  incident: true,
  aggressors: true,
  witnesses: true,
  evidence: true,
  assignedTo: { select: { id: true, name: true, role: true, email: true } },
  notes: {
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  statusHistory: {
    include: { changedBy: { select: { id: true, name: true } } },
    orderBy: { changedAt: 'asc' as const },
  },
};

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  // ── Creación desde el bot ────────────────────────────────────────────────

  async create(data: CreateReportDto) {
    return this.prisma.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: {
          telegramUserId: data.telegramUserId,
          institutionId: data.institutionId ?? null,
          informantType: INFORMANT_MAP[data.informantType],
          wantsContact: data.wantsContact,
          previousReport: data.previousReport,
        },
      });

      await tx.incident.create({
        data: {
          reportId: report.id,
          harassmentType: HARASSMENT_MAP[data.harassmentType],
          frequencyLevel: FREQUENCY_MAP[data.frequencyLevel],
          locationTag: LOCATION_MAP[data.locationTag],
          incidentDateApprox: DATE_MAP[data.incidentDate],
          description: data.descriptionText,
        },
      });

      await tx.aggressor.create({
        data: { reportId: report.id, description: data.aggressorInfo },
      });

      if (data.witnessInfo) {
        await tx.witness.create({
          data: { reportId: report.id, description: data.witnessInfo },
        });
      }

      if (data.evidenceUrl) {
        await tx.evidence.create({
          data: { reportId: report.id, url: data.evidenceUrl },
        });
      }

      await tx.statusHistory.create({
        data: {
          reportId: report.id,
          newStatus: ReportStatus.PENDING,
          notes: 'Reporte recibido vía Telegram.',
        },
      });

      return report;
    });
  }

  // ── Listado con filtros (para el panel DECE) ─────────────────────────────

  async findAll(options: {
    limit?: number;
    offset?: number;
    status?: ReportStatus;
    priority?: Priority;
    harassmentType?: HarassmentType;
    assignedToId?: string;
    institutionId?: string | null;
  } = {}) {
    const { limit = 20, offset = 0, status, priority, harassmentType, assignedToId, institutionId } = options;

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedToId) where.assignedToId = assignedToId;
    if (harassmentType) where.incident = { harassmentType };
    if (institutionId) where.institutionId = institutionId;

    const [data, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: REPORT_LIST_INCLUDE,
      }),
      this.prisma.report.count({ where }),
    ]);

    return { data, total, limit, offset };
  }

  // ── Detalle completo de un reporte ───────────────────────────────────────

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: REPORT_DETAIL_INCLUDE,
    });

    if (!report) throw new NotFoundException(`Reporte ${id} no encontrado.`);
    return report;
  }

  async findByReportNumber(reportNumber: number) {
    const report = await this.prisma.report.findUnique({
      where: { reportNumber },
      include: REPORT_DETAIL_INCLUDE,
    });

    if (!report) throw new NotFoundException(`Reporte #${reportNumber} no encontrado.`);
    return report;
  }

  // ── Acciones del panel DECE ──────────────────────────────────────────────

  async updateStatus(
    id: string,
    newStatus: ReportStatus,
    changedById?: string,
    notes?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.report.findUnique({
        where: { id },
        select: { status: true },
      });

      if (!current) throw new NotFoundException(`Reporte ${id} no encontrado.`);

      await tx.statusHistory.create({
        data: { reportId: id, oldStatus: current.status, newStatus, changedById, notes },
      });

      return tx.report.update({
        where: { id },
        data: { status: newStatus },
        include: REPORT_LIST_INCLUDE,
      });
    });
  }

  async updatePriority(id: string, priority: Priority) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException(`Reporte ${id} no encontrado.`);

    return this.prisma.report.update({
      where: { id },
      data: { priority },
      include: REPORT_LIST_INCLUDE,
    });
  }

  async assignTo(id: string, assignedToId: string | null) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException(`Reporte ${id} no encontrado.`);

    return this.prisma.report.update({
      where: { id },
      data: { assignedToId },
      include: REPORT_LIST_INCLUDE,
    });
  }

  // ── Notas internas DECE ──────────────────────────────────────────────────

  async addNote(reportId: string, authorId: string, content: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException(`Reporte ${reportId} no encontrado.`);

    return this.prisma.caseNote.create({
      data: { reportId, authorId, content },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
  }

  async getNotes(reportId: string) {
    return this.prisma.caseNote.findMany({
      where: { reportId },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Estadísticas para el dashboard DECE ─────────────────────────────────

  async getStats(institutionId?: string | null) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const scope = institutionId ? { institutionId } : {};
    const incidentScope = institutionId ? { report: { institutionId } } : {};

    const [
      total,
      lastSevenDays,
      byStatus,
      byPriority,
      byHarassmentType,
      byFrequency,
      byLocation,
      pendingCount,
      urgentCount,
    ] = await Promise.all([
      this.prisma.report.count({ where: scope }),
      this.prisma.report.count({ where: { ...scope, createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.report.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
      this.prisma.report.groupBy({ by: ['priority'], where: scope, _count: { _all: true } }),
      this.prisma.incident.groupBy({ by: ['harassmentType'], where: incidentScope, _count: { _all: true } }),
      this.prisma.incident.groupBy({ by: ['frequencyLevel'], where: incidentScope, _count: { _all: true } }),
      this.prisma.incident.groupBy({ by: ['locationTag'], where: incidentScope, _count: { _all: true } }),
      this.prisma.report.count({ where: { ...scope, status: 'PENDING' } }),
      this.prisma.report.count({ where: { ...scope, priority: 'URGENT' } }),
    ]);

    return {
      total,
      lastSevenDays,
      pendingCount,
      urgentCount,
      byStatus,
      byPriority,
      byHarassmentType,
      byFrequency,
      byLocation,
    };
  }
}
