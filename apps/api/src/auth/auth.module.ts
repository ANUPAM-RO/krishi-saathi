import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_CONFIG, AppConfig } from '../config/configuration';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SmsService } from './sms.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        secret: config.jwtSecret,
        // jsonwebtoken accepts strings like "15m"; its type is a template literal union.
        signOptions: { expiresIn: config.accessTokenTtl as `${number}m` },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SmsService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
