import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { InstitutionService } from './institution.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtAdminGuard } from '../auth/jwt-admin.guard';

@Controller('institutions')
@UseGuards(JwtAuthGuard)
export class InstitutionController {
  constructor(private inst: InstitutionService) {}

  @Get()
  findAll() {
    return this.inst.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inst.findOne(id);
  }

  @Post()
  @UseGuards(JwtAdminGuard)
  create(@Body() body: { name: string; city?: string; code?: string }) {
    return this.inst.create(body);
  }

  @Patch(':id')
  @UseGuards(JwtAdminGuard)
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; city?: string; code?: string; active?: boolean },
  ) {
    return this.inst.update(id, body);
  }
}
