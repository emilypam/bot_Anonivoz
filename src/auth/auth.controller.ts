import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAdminGuard } from './jwt-admin.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @Get('login-logs')
  @UseGuards(JwtAdminGuard)
  getLoginLogs(@Query('limit') limit?: string) {
    return this.auth.getLoginLogs(limit ? Math.min(parseInt(limit), 500) : 100);
  }

  @Post('admin/bootstrap')
  bootstrapAdmin(
    @Body() body: { name: string; email: string; password: string; key: string },
  ) {
    return this.auth.bootstrapAdmin(body);
  }

  @Post('bootstrap')
  bootstrapDece(
    @Body() body: { name: string; email: string; password: string; key: string },
  ) {
    return this.auth.bootstrapDece(body);
  }
}
