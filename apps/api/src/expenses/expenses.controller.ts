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
import { ApiBearerAuth, ApiTags, OmitType, PartialType } from '@nestjs/swagger';
import { ExpenseCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/decorators';
import { ExpensesService } from './expenses.service';

export class CreateExpenseDto {
  @IsUUID() farmerCropId: string;
  @IsEnum(ExpenseCategory) category: ExpenseCategory;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(10_000_000) amount: number;
  /** YYYY-MM-DD */
  @IsDateString() expenseDate: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}

export class UpdateExpenseDto extends PartialType(OmitType(CreateExpenseDto, ['farmerCropId'] as const)) {}

export class ExpenseQueryDto {
  @IsOptional() @IsUUID() farmerCropId?: string;
}

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: ExpenseQueryDto) {
    return this.expenses.list(user.id, q.farmerCropId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseDto) {
    return this.expenses.create(user.id, dto);
  }

  @Put(':id')
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateExpenseDto) {
    return this.expenses.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.expenses.remove(user.id, id);
  }
}
