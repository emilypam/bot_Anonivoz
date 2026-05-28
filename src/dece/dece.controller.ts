import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { DeceService } from './dece.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dece')
@UseGuards(JwtAuthGuard)
export class DeceController {
  constructor(private dece: DeceService) {}

  @Get('me')
  me(@Request() req: any) {
    return this.dece.findById(req.user.id);
  }

  @Get('members')
  findAll(
    @Request() req: any,
    @Query('institutionId') institutionIdParam?: string,
  ) {
    const user = req.user;
    const institutionId = user.isAdmin
      ? (institutionIdParam ?? undefined)
      : (user.institutionId ?? undefined);
    return this.dece.findAll({ institutionId });
  }

  @Post('members')
  create(
    @Body() body: { name: string; email: string; password: string; role: string; institutionId?: string },
    @Request() req: any,
  ) {
    const user = req.user;
    const institutionId = user.isAdmin ? body.institutionId : user.institutionId;
    return this.dece.create({ ...body, institutionId });
  }

  @Patch('members/:id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; role?: string; active?: boolean; institutionId?: string },
  ) {
    return this.dece.update(id, body);
  }

  @Patch('members/:id/password')
  updatePassword(
    @Param('id') id: string,
    @Body() body: { password: string },
  ) {
    return this.dece.updatePassword(id, body.password);
  }
}
