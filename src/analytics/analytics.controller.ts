import { Controller, Delete, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAdminGuard } from '../auth/jwt-admin.guard';

@Controller('analytics')
@UseGuards(JwtAdminGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('bot-usage')
  getBotUsage() {
    return this.analyticsService.getBotUsage();
  }

  @Delete('cleanup-old-reports')
  cleanupOldReports() {
    return this.analyticsService.deleteReportsBefore('2026-06-10');
  }
}
