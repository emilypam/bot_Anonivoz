import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'changeme_secret',
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role: string;
    institutionId?: string | null;
    type: 'dece' | 'admin';
  }) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      institutionId: payload.institutionId ?? null,
      isAdmin: payload.type === 'admin',
    };
  }
}
