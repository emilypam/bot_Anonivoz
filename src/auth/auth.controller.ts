import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
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
