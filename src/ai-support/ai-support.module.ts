import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiSupportService } from './ai-support.service';

@Module({
  imports: [ConfigModule],
  providers: [AiSupportService],
  exports: [AiSupportService],
})
export class AiSupportModule {}
