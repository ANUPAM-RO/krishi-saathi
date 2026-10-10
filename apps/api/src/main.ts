import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { APP_CONFIG, AppConfig } from './config/configuration';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: true });
  const config = app.get<AppConfig>(APP_CONFIG);
  setupApp(app, config);

  if (config.nodeEnv !== 'production') {
    const doc = new DocumentBuilder()
      .setTitle('Krishi Saathi API')
      .setDescription('Farmer and admin REST API. See docs/API.md for conventions.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));
  }

  await app.listen(config.port);
  const logger = new Logger('Bootstrap');
  logger.log(`API listening on http://localhost:${config.port}/api`);
  if (config.otpDevMode) logger.warn('OTP_DEV_MODE is enabled: OTP codes are returned in API responses.');
}

void bootstrap();
