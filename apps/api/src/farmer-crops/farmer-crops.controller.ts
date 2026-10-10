import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators';
import { CreateFarmerCropDto, FarmerCropQueryDto, UpdateFarmerCropDto } from './dto';
import { FarmerCropsService } from './farmer-crops.service';

@ApiTags('farmer-crops')
@ApiBearerAuth()
@Controller('farmer-crops')
export class FarmerCropsController {
  constructor(private readonly service: FarmerCropsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: FarmerCropQueryDto) {
    return this.service.list(user.id, q);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFarmerCropDto) {
    return this.service.create(user.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(user.id, id);
  }

  @Put(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFarmerCropDto) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(user.id, id);
  }

  @Get(':id/activities')
  activities(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.activities(user.id, id);
  }

  @Get(':id/profit')
  profit(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.profit(user.id, id);
  }
}
