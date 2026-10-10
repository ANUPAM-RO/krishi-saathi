import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CropSeason } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export class CropQueryDto {
  @IsOptional() @IsEnum(CropSeason) season?: CropSeason;
}

@ApiTags('crops')
@ApiBearerAuth()
@Controller('crops')
export class CropsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query() q: CropQueryDto) {
    return this.prisma.crop.findMany({
      where: { isActive: true, season: q.season },
      orderBy: { name: 'asc' },
    });
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const crop = await this.prisma.crop.findFirst({
      where: { id, isActive: true },
      include: {
        calendarTemplates: {
          where: { isActive: true },
          orderBy: [{ dayOffset: 'asc' }, { sortOrder: 'asc' }],
          select: { id: true, activityType: true, dayOffset: true, title: true, titleHi: true, titleBn: true },
        },
      },
    });
    if (!crop) throw new NotFoundException('Crop not found');
    const { calendarTemplates, ...rest } = crop;
    return { ...rest, calendar: calendarTemplates };
  }
}
