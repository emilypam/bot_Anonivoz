import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportModule } from '../report/report.module';
import { AiSupportModule } from '../ai-support/ai-support.module';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';

@Module({
  imports: [ConfigModule, PrismaModule, forwardRef(() => ReportModule), AiSupportModule],
  providers: [BotService],
  controllers: [BotController],
  exports: [BotService],
})
export class BotModule {}
