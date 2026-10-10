import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function pageArgs(q: PaginationQueryDto): { skip: number; take: number; page: number; pageSize: number } {
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 20;
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}
