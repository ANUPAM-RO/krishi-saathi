import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Language } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { userSelect } from '../auth/user-select';
import { AuthUser, CurrentUser } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(100) village?: string;
  @IsOptional() @IsString() @MaxLength(100) district?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsEnum(Language) language?: Language;
}

export class DeviceTokenDto {
  @IsString() @IsNotEmpty() @MaxLength(300) token: string;
  @IsOptional() @IsString() @MaxLength(20) platform?: string;
}

@ApiTags('farmer')
@ApiBearerAuth()
@Controller('farmers/me')
export class FarmersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: userSelect });
  }

  @Put()
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    const trim = (v?: string | null) => (v === undefined ? undefined : v?.trim() || null);
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: trim(dto.name),
        village: trim(dto.village),
        district: trim(dto.district),
        state: trim(dto.state),
        language: dto.language,
      },
      select: userSelect,
    });
  }

  @Post('device-tokens')
  @HttpCode(HttpStatus.NO_CONTENT)
  async registerDevice(@CurrentUser() user: AuthUser, @Body() dto: DeviceTokenDto) {
    // A device token belongs to whichever user last signed in on that device.
    await this.prisma.deviceToken.upsert({
      where: { token: dto.token },
      create: { token: dto.token, userId: user.id, platform: dto.platform ?? 'android' },
      update: { userId: user.id, platform: dto.platform ?? 'android' },
    });
  }

  @Delete('device-tokens/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDevice(@CurrentUser() user: AuthUser, @Param('token') token: string) {
    await this.prisma.deviceToken.deleteMany({ where: { token, userId: user.id } });
  }
}
