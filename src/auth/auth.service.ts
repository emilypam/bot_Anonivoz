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
    // Intentar como miembro DECE primero
    const member = await this.prisma.deceMember.findUnique({ where: { email } });
    if (member) {
      if (!member.active) throw new UnauthorizedException('Cuenta desactivada');
      const valid = await bcrypt.compare(password, member.password);
      if (!valid) throw new UnauthorizedException('Credenciales incorrectas');
      const token = this.jwt.sign({
        sub: member.id,
        email: member.email,
        role: member.role,
        institutionId: member.institutionId,
        type: 'dece',
      });
      return {
        access_token: token,
        user: {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          institutionId: member.institutionId,
          isAdmin: false,
        },
      };
    }

    // Intentar como administrador global
    const admin = await this.prisma.admin.findUnique({ where: { email } });
    if (admin) {
      if (!admin.active) throw new UnauthorizedException('Cuenta desactivada');
      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) throw new UnauthorizedException('Credenciales incorrectas');
      const token = this.jwt.sign({
        sub: admin.id,
        email: admin.email,
        role: 'ADMIN',
        institutionId: null,
        type: 'admin',
      });
      return {
        access_token: token,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: 'ADMIN',
          institutionId: null,
          isAdmin: true,
        },
      };
    }

    throw new UnauthorizedException('Credenciales incorrectas');
  }

  async bootstrapAdmin(body: {
    name: string;
    email: string;
    password: string;
    key: string;
  }) {
    if (body.key !== process.env.ADMIN_REGISTRATION_KEY) {
      throw new UnauthorizedException('Clave de registro inválida');
    }
    const count = await this.prisma.admin.count();
    if (count > 0) {
      throw new ConflictException('Ya existe un administrador registrado');
    }
    const hashed = await bcrypt.hash(body.password, 10);
    return this.prisma.admin.create({
      data: { name: body.name, email: body.email, password: hashed },
      select: { id: true, name: true, email: true },
    });
  }

  async bootstrapDece(body: {
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
      throw new ConflictException('El sistema ya tiene miembros registrados');
    }
    const hashed = await bcrypt.hash(body.password, 10);
    return this.prisma.deceMember.create({
      data: { name: body.name, email: body.email, password: hashed, role: 'COORDINATOR' },
      select: { id: true, name: true, email: true, role: true },
    });
  }
}
