import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Language, Prisma } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

export class AdvisoryQueryDto {
  @IsOptional() @IsUUID() cropId?: string;
  @IsOptional() @IsEnum(Language) language?: Language;
}

@ApiTags('advisories')
@ApiBearerAuth()
@Controller('advisories')
export class AdvisoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() q: AdvisoryQueryDto) {
    const me = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { language: true, state: true, district: true },
    });
    const region = (field: 'state' | 'district', value: string | null): Prisma.CropAdvisoryWhereInput =>
      value ? { OR: [{ [field]: null }, { [field]: { equals: value, mode: 'insensitive' } }] } : { [field]: null };

    return this.prisma.cropAdvisory.findMany({
      where: {
        isPublished: true,
        language: q.language ?? me.language,
        AND: [
          region('state', me.state),
          region('district', me.district),
          ...(q.cropId ? [{ OR: [{ cropId: q.cropId }, { cropId: null }] }] : []),
        ],
      },
      include: { crop: true },
      orderBy: { publishedAt: 'desc' },
      take: 100,
    });
  }
}
