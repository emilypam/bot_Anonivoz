import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DeceService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.deceMember.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        _count: { select: { assignedReports: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const member = await this.prisma.deceMember.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
    if (!member) throw new NotFoundException('Miembro no encontrado');
    return member;
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) {
    const exists = await this.prisma.deceMember.findUnique({
      where: { email: data.email },
    });
    if (exists) throw new ConflictException('El correo ya está registrado');
    const hashed = await bcrypt.hash(data.password, 10);
    return this.prisma.deceMember.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashed,
        role: data.role as any,
      },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  update(
    id: string,
    data: { name?: string; email?: string; role?: string; active?: boolean },
  ) {
    return this.prisma.deceMember.update({
      where: { id },
      data: data as any,
      select: { id: true, name: true, email: true, role: true, active: true },
    });
  }

  async updatePassword(id: string, password: string) {
    const hashed = await bcrypt.hash(password, 10);
    await this.prisma.deceMember.update({
      where: { id },
      data: { password: hashed },
    });
    return { message: 'Contraseña actualizada' };
  }
}
