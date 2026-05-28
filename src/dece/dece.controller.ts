import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
  findAll() {
    return this.dece.findAll();
  }

  @Post('members')
  create(
    @Body()
    body: { name: string; email: string; password: string; role: string },
  ) {
    return this.dece.create(body);
  }

  @Patch('members/:id')
  update(
    @Param('id') id: string,
    @Body()
    body: { name?: string; email?: string; role?: string; active?: boolean },
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
