import { Language } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class SendOtpDto {
  /** 10-digit Indian mobile number, or E.164 (+91...). */
  @IsString()
  @MaxLength(20)
  phone: string;
}

export class VerifyOtpDto {
  @IsString()
  @MaxLength(20)
  phone: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code: string;

  /** Preferred language, applied when the account is created. */
  @IsOptional()
  @IsEnum(Language)
  language?: Language;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  refreshToken: string;
}
