import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppConfig } from './config/configuration';

/** Shared HTTP setup for the real server and e2e tests. */
export function setupApp(app: INestApplication, config: AppConfig) {
  const express = app as NestExpressApplication;
  // Behind a load balancer/proxy in staging/production; needed for correct client IPs in rate limiting.
  express.set('trust proxy', 1);
  // Outside production the API is reached over plain HTTP on a LAN IP (phones, Swagger), so don't force HTTPS.
  const isProd = config.nodeEnv === 'production';
  express.use(
    helmet({
      contentSecurityPolicy: { directives: { upgradeInsecureRequests: isProd ? [] : null } },
      strictTransportSecurity: isProd,
    }),
  );
  express.useBodyParser('json', { limit: '2mb' });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.corsOrigins.length ? config.corsOrigins : false, credentials: false });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
}
