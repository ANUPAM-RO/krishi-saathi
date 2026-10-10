import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Language, SchemeCategory } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

export class SchemeQueryDto {
  @IsOptional() @IsEnum(SchemeCategory) category?: SchemeCategory;
  @IsOptional() @IsEnum(Language) language?: Language;
}

@ApiTags('schemes')
@ApiBearerAuth()
@Controller('schemes')
export class SchemesController {
  constructor(private readonly prisma: PrismaService) {}

  /** Published schemes in the farmer's language: central schemes plus those of the farmer's state. */
  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() q: SchemeQueryDto) {
    const me = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { language: true, state: true } });
    return this.prisma.governmentScheme.findMany({
      where: {
        isPublished: true,
        language: q.language ?? me.language,
        category: q.category,
        OR: [{ state: null }, ...(me.state ? [{ state: { equals: me.state, mode: 'insensitive' as const } }] : [])],
      },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
      take: 200,
    });
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const scheme = await this.prisma.governmentScheme.findFirst({ where: { id, isPublished: true } });
    if (!scheme) throw new NotFoundException('Scheme not found');
    return scheme;
  }
}
