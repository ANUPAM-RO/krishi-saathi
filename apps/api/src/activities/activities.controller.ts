import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/decorators';
import { ActivitiesService, ActivityRange } from './activities.service';

export class ActivityQueryDto {
  @IsOptional()
  @IsIn(['today', 'upcoming', 'overdue', 'completed'])
  range?: ActivityRange = 'today';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(90) days?: number = 7;
}

@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: ActivityQueryDto) {
    return this.activities.list(user.id, q.range ?? 'today', q.days ?? 7);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.activities.setCompleted(user.id, id, true);
  }

  @Post(':id/uncomplete')
  @HttpCode(HttpStatus.OK)
  uncomplete(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.activities.setCompleted(user.id, id, false);
  }
}
