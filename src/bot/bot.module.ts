import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportModule } from '../report/report.module';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';

@Module({
  imports: [ConfigModule, PrismaModule, ReportModule],
  providers: [BotService],
  controllers: [BotController],
})
export class BotModule {}
