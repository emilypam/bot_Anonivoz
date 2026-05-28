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

  @Post('bootstrap')
  bootstrap(
    @Body() body: { name: string; email: string; password: string; key: string },
  ) {
    return this.auth.bootstrap(body);
  }
}
