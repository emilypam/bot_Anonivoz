import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';

const server = express();
let initPromise: Promise<void> | null = null;

async function bootstrap() {
  const { AppModule } = await import('../dist/app.module');
  const adapter = new ExpressAdapter(server);
  const app = await NestFactory.create(AppModule, adapter, {
    logger: ['error', 'warn'],
  });
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });
  await app.init();
}

export default async function handler(req: any, res: any) {
  if (!initPromise) initPromise = bootstrap();
  await initPromise;
  server(req, res);
}
