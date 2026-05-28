import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { HarassmentType, Priority, ReportStatus } from '@prisma/client';

@Controller('api/reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // ── Creación desde el bot ──────────────────────────────────────────────

  @Post()
  create(@Body() dto: CreateReportDto) {
    return this.reportService.create(dto);
  }

  // ── Listado con filtros (panel DECE) ───────────────────────────────────

  @Get()
  findAll(
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
    @Query('status') status?: ReportStatus,
    @Query('priority') priority?: Priority,
    @Query('harassmentType') harassmentType?: HarassmentType,
    @Query('assignedToId') assignedToId?: string,
  ) {
    return this.reportService.findAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      status,
      priority,
      harassmentType,
      assignedToId,
    });
  }

  // ── Estadísticas para el dashboard ────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.reportService.getStats();
  }

  // ── Detalle por número de reporte (legible) ────────────────────────────

  @Get('number/:reportNumber')
  findByNumber(@Param('reportNumber') reportNumber: string) {
    return this.reportService.findByReportNumber(parseInt(reportNumber));
  }

  // ── Detalle por UUID ──────────────────────────────────────────────────

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportService.findOne(id);
  }

  // ── Cambiar estado del caso ────────────────────────────────────────────

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: ReportStatus; changedById?: string; notes?: string },
  ) {
    return this.reportService.updateStatus(id, body.status, body.changedById, body.notes);
  }

  // ── Cambiar prioridad ─────────────────────────────────────────────────

  @Patch(':id/priority')
  updatePriority(
    @Param('id') id: string,
    @Body() body: { priority: Priority },
  ) {
    return this.reportService.updatePriority(id, body.priority);
  }

  // ── Asignar a un consejero DECE ────────────────────────────────────────

  @Patch(':id/assign')
  assignTo(
    @Param('id') id: string,
    @Body() body: { assignedToId: string | null },
  ) {
    return this.reportService.assignTo(id, body.assignedToId);
  }

  // ── Notas internas del caso ────────────────────────────────────────────

  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body() body: { authorId: string; content: string },
  ) {
    return this.reportService.addNote(id, body.authorId, body.content);
  }

  @Get(':id/notes')
  getNotes(@Param('id') id: string) {
    return this.reportService.getNotes(id);
  }
}
