import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const member = await this.prisma.deceMember.findUnique({ where: { email } });
    if (!member || !member.active) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    const valid = await bcrypt.compare(password, member.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    const token = this.jwt.sign({
      sub: member.id,
      email: member.email,
      role: member.role,
    });
    return {
      access_token: token,
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
      },
    };
  }

  async bootstrap(body: {
    name: string;
    email: string;
    password: string;
    key: string;
  }) {
    if (body.key !== process.env.REGISTRATION_KEY) {
      throw new UnauthorizedException('Clave de registro inválida');
    }
    const count = await this.prisma.deceMember.count();
    if (count > 0) {
      throw new ConflictException(
        'El sistema ya tiene miembros registrados',
      );
    }
    const hashed = await bcrypt.hash(body.password, 10);
    return this.prisma.deceMember.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashed,
        role: 'COORDINATOR',
      },
      select: { id: true, name: true, email: true, role: true },
    });
  }
}
