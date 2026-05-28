import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { HarassmentType, Priority, ReportStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  create(@Body() dto: CreateReportDto) {
    return this.reportService.create(dto);
  }

  @Get()
  findAll(
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
    @Query('status') status?: ReportStatus,
    @Query('priority') priority?: Priority,
    @Query('harassmentType') harassmentType?: HarassmentType,
    @Query('assignedToId') assignedToId?: string,
    @Query('institutionId') institutionIdParam?: string,
    @Request() req?: any,
  ) {
    const user = req?.user;
    const institutionId = user?.isAdmin
      ? (institutionIdParam ?? undefined)
      : (user?.institutionId ?? undefined);

    return this.reportService.findAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      status,
      priority,
      harassmentType,
      assignedToId,
      institutionId,
    });
  }

  @Get('stats')
  getStats(@Request() req: any) {
    const user = req.user;
    const institutionId = user.isAdmin ? undefined : user.institutionId;
    return this.reportService.getStats(institutionId);
  }

  @Get('number/:reportNumber')
  findByNumber(@Param('reportNumber') reportNumber: string) {
    return this.reportService.findByReportNumber(parseInt(reportNumber));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: ReportStatus; notes?: string },
    @Request() req: any,
  ) {
    return this.reportService.updateStatus(id, body.status, req.user.id, body.notes);
  }

  @Patch(':id/priority')
  updatePriority(
    @Param('id') id: string,
    @Body() body: { priority: Priority },
  ) {
    return this.reportService.updatePriority(id, body.priority);
  }

  @Patch(':id/assign')
  assignTo(
    @Param('id') id: string,
    @Body() body: { assignedToId: string | null },
  ) {
    return this.reportService.assignTo(id, body.assignedToId);
  }

  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Request() req: any,
  ) {
    return this.reportService.addNote(id, req.user.id, body.content);
  }

  @Get(':id/notes')
  getNotes(@Param('id') id: string) {
    return this.reportService.getNotes(id);
  }
}
