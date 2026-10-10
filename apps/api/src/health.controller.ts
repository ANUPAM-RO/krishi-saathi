import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from './common/decorators';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @SkipThrottle()
  @Get()
  async health() {
    const db = await this.prisma.$queryRaw`SELECT 1`.then(
      () => 'ok' as const,
      () => 'error' as const,
    );
    return { status: 'ok', db, time: new Date().toISOString() };
  }
}
