import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { BotModule } from './bot/bot.module';
import { ReportModule } from './report/report.module';
import { AuthModule } from './auth/auth.module';
import { DeceModule } from './dece/dece.module';
import { InstitutionModule } from './institution/institution.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    BotModule,
    ReportModule,
    AuthModule,
    DeceModule,
    InstitutionModule,
  ],
})
export class AppModule {}
