import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Language, Role } from '@prisma/client';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { APP_CONFIG, AppConfig } from '../config/configuration';
import { normalizeIndianPhone } from '../common/phone';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from './sms.service';
import { PublicUser, userSelect } from './user-select';

const OTP_TTL_SECONDS = 5 * 60;
const OTP_RESEND_COOLDOWN_SECONDS = 30;
const OTP_MAX_PER_HOUR = 5;
const OTP_MAX_ATTEMPTS = 5;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sms: SmsService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async sendOtp(rawPhone: string) {
    const phone = normalizeIndianPhone(rawPhone);
    const now = Date.now();

    const recent = await this.prisma.otpRequest.findMany({
      where: { phone, createdAt: { gte: new Date(now - 60 * 60 * 1000) } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (recent[0] && now - recent[0].createdAt.getTime() < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
      throw new HttpException('Please wait a few seconds before requesting another OTP', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (recent.length >= OTP_MAX_PER_HOUR) {
      throw new HttpException('Too many OTP requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.otpRequest.create({
      data: { phone, codeHash: this.hashOtp(phone, code), expiresAt: new Date(now + OTP_TTL_SECONDS * 1000) },
    });
    await this.sms.sendOtp(phone, code);

    return {
      phone,
      expiresInSeconds: OTP_TTL_SECONDS,
      ...(this.config.otpDevMode ? { devCode: code } : {}),
    };
  }

  async verifyOtp(rawPhone: string, code: string, language?: Language) {
    const phone = normalizeIndianPhone(rawPhone);
    const otp = await this.prisma.otpRequest.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw new BadRequestException('OTP expired or not requested. Please request a new OTP.');
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Too many wrong attempts. Please request a new OTP.');
    }

    const expected = Buffer.from(otp.codeHash, 'hex');
    const actual = Buffer.from(this.hashOtp(phone, code), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      await this.prisma.otpRequest.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException('Incorrect OTP');
    }

    // Consume atomically so the same code can't be used twice concurrently.
    const consumed = await this.prisma.otpRequest.updateMany({
      where: { id: otp.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count === 0) throw new BadRequestException('OTP already used. Please request a new OTP.');

    const isAdminPhone = this.config.adminPhones.includes(phone);
    let user = await this.prisma.user.findUnique({ where: { phone }, select: userSelect });
    const isNewUser = !user;

    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, language: language ?? 'bn', role: isAdminPhone ? Role.ADMIN : Role.FARMER, lastLoginAt: new Date() },
        select: userSelect,
      });
    } else {
      if (!user.isActive) throw new ForbiddenException('This account has been deactivated. Please contact support.');
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), ...(isAdminPhone && user.role !== Role.ADMIN ? { role: Role.ADMIN } : {}) },
        select: userSelect,
      });
    }

    const tokens = await this.issueTokens(user);
    return { ...tokens, user, isNewUser };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(refreshToken) },
      include: { user: { select: userSelect } },
    });
    if (!record) throw new UnauthorizedException('Invalid refresh token');

    if (record.revokedAt) {
      // A revoked token being replayed suggests theft: revoke every session for this user.
      await this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token has been revoked');
    }
    if (record.expiresAt < new Date()) throw new UnauthorizedException('Refresh token expired');
    if (!record.user.isActive) throw new UnauthorizedException('Account is not active');

    const revoked = await this.prisma.refreshToken.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count === 0) throw new UnauthorizedException('Refresh token has been revoked');

    return this.issueTokens(record.user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: userSelect });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async issueTokens(user: Pick<PublicUser, 'id' | 'role'>): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role });
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + this.config.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken };
  }

  private hashOtp(phone: string, code: string): string {
    return createHmac('sha256', this.config.otpSecret).update(`${phone}:${code}`).digest('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
