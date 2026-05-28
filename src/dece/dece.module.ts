import { Module } from '@nestjs/common';
import { DeceController } from './dece.controller';
import { DeceService } from './dece.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DeceController],
  providers: [DeceService],
})
export class DeceModule {}
