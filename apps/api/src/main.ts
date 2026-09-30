import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { securityHeaders } from './common/security';

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/$/, '');
}

function allowedOrigins() {
  const configured = String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  if (process.env.NODE_ENV === 'production') {
    return Array.from(new Set(['https://unigest-web.vercel.app', ...configured]));
  }
  return Array.from(new Set(['http://localhost:3000', ...configured]));
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const origins = allowedOrigins();

  app.use(securityHeaders);

  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) {
      if (!origin) return callback(null, true);
      const normalized = normalizeOrigin(origin);
      if (origins.includes(normalized)) return callback(null, true);
      return callback(new Error(`Origin non autorisée par CORS: ${normalized}`), false);
    },
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidUnknownValues: true,
  }));

  const port = Number(process.env.PORT || process.env.API_PORT || 3000);
  await app.listen(port);
}

bootstrap();
