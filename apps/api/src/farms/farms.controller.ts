import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators';
import { CreateFarmDto, UpdateFarmDto } from './dto';
import { FarmsService } from './farms.service';

@ApiTags('farms')
@ApiBearerAuth()
@Controller('farms')
export class FarmsController {
  constructor(private readonly farms: FarmsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.farms.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFarmDto) {
    return this.farms.create(user.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.farms.get(user.id, id);
  }

  @Put(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFarmDto) {
    return this.farms.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.farms.remove(user.id, id);
  }
}
