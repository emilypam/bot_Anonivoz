import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InstitutionService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.institution.findMany({
      include: {
        _count: { select: { members: true, reports: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const inst = await this.prisma.institution.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true, reports: true } },
      },
    });
    if (!inst) throw new NotFoundException('Institución no encontrada');
    return inst;
  }

  async findByCode(code: string) {
    return this.prisma.institution.findUnique({ where: { code } });
  }

  async create(data: { name: string; city?: string; code?: string }) {
    const code = data.code?.trim().toUpperCase() || this.generateCode(data.name);
    const exists = await this.prisma.institution.findUnique({ where: { code } });
    if (exists) throw new ConflictException('El código ya está en uso');
    return this.prisma.institution.create({
      data: { name: data.name, city: data.city, code },
    });
  }

  async update(id: string, data: { name?: string; city?: string; code?: string; active?: boolean }) {
    const inst = await this.prisma.institution.findUnique({ where: { id } });
    if (!inst) throw new NotFoundException('Institución no encontrada');
    if (data.code) {
      data.code = data.code.trim().toUpperCase();
      const conflict = await this.prisma.institution.findUnique({ where: { code: data.code } });
      if (conflict && conflict.id !== id) throw new ConflictException('El código ya está en uso');
    }
    return this.prisma.institution.update({ where: { id }, data });
  }

  private generateCode(name: string): string {
    const prefix = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 4)
      .padEnd(3, 'X');
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${suffix}`;
  }
}
