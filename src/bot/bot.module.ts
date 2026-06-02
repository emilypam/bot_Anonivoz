import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportModule } from '../report/report.module';
import { AiSupportModule } from '../ai-support/ai-support.module';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';

@Module({
  imports: [ConfigModule, PrismaModule, ReportModule, AiSupportModule],
  providers: [BotService],
  controllers: [BotController],
})
export class BotModule {}
