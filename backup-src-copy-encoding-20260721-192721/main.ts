import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as dotenv from 'dotenv';
import * as cors from 'cors';

function isIgnorablePuppeteerCloseError(error: any): boolean {
  const message = String(error?.message || error || '');
  const stack = String(error?.stack || '');
  const isCloseError =
    message.includes('Target closed') ||
    message.includes('Session closed') ||
    message.includes('Connection closed');

  return isCloseError && stack.toLowerCase().includes('puppeteer');
}

process.on('unhandledRejection', (reason: any) => {
  if (isIgnorablePuppeteerCloseError(reason)) {
    console.warn(`Puppeteer close event ignored: ${reason?.message || reason}`);
    return;
  }

  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (error: any) => {
  if (isIgnorablePuppeteerCloseError(error)) {
    console.warn(`Puppeteer close exception ignored: ${error?.message || error}`);
    return;
  }

  console.error('Uncaught exception:', error);
  process.exit(1);
});

async function bootstrap() {
  // ✅ .env 파일 로드
  dotenv.config({ override: true });

  // ✅ NestJS 앱 생성 (포트 3000)
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // ✅ Express 서버 (포트 3001)
  const expressApp = express();
  expressApp.use(cors());

  // ✅ 가상 XML 파일 제공 라우트
  expressApp.get('/godomall/xml/:styleId', (req, res) => {
    const { styleId } = req.params;
    const filePath = join(os.tmpdir(), `${styleId}.xml`);

    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send('File not found');
    }
  });

  // ✅ NestJS 서버 실행 (3000)
  await app.listen(3000);
  console.log('🚀 NestJS 서버가 3000 포트에서 실행 중입니다.');

  // ✅ Express 서버 실행 (3001)
  expressApp.listen(3001, () => {
    console.log('📦 Express 서버가 3001 포트에서 실행 중입니다.');
  });


}

bootstrap();
