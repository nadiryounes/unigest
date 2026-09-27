import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createServer } from 'node:http';
import { AppModule } from './app.module';

function normalizeOrigin(value: string) {
  return value.trim().replace(/\/$/, '');
}

function allowedOrigins() {
  const configured = String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  if (process.env.NODE_ENV === 'production') {
    return Array.from(new Set([
      'https://unigest-web.vercel.app',
      ...configured,
    ]));
  }

  return Array.from(new Set([
    'http://localhost:3000',
    ...configured,
  ]));
}

function safeStartupError(error: unknown) {
  const anyError = error as any;
  const rawMessage = error instanceof Error ? error.message : String(error);
  const databaseUrl = String(process.env.DATABASE_URL || '');
  const safeMessage = databaseUrl ? rawMessage.replaceAll(databaseUrl, '[DATABASE_URL]') : rawMessage;
  return {
    name: error instanceof Error ? error.name : 'Error',
    code: anyError?.code || undefined,
    message: safeMessage.slice(0, 500),
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const origins = allowedOrigins();

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

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = Number(process.env.PORT || process.env.API_PORT || 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`UniGest API listening on port ${port}`);
}

bootstrap().catch((error) => {
  console.error('UniGest API bootstrap failed', error);

  if (process.env.NODE_ENV !== 'production') {
    process.exitCode = 1;
    return;
  }

  const port = Number(process.env.PORT || process.env.API_PORT || 4000);
  const diagnostic = safeStartupError(error);

  createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', 'https://unigest-web.vercel.app');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.url === '/health') {
      res.statusCode = 503;
      res.end(JSON.stringify({
        status: 'down',
        startupError: diagnostic,
        version: '0.4.1',
      }));
      return;
    }

    res.statusCode = 503;
    res.end(JSON.stringify({
      status: 'down',
      message: 'UniGest API failed during startup',
    }));
  }).listen(port, '0.0.0.0');
});
