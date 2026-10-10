import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { AuditService } from '../common/audit/audit.service';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { pageArgs } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminSchemeQueryDto,
  AdminSupplierQueryDto,
  CreateSchemeDto,
  CreateSupplierDto,
  UpdateSchemeDto,
  UpdateSupplierDto,
} from './dto';

const blankToNull = (v?: string | null) => (v === undefined ? undefined : v?.trim() || null);

/** Trims optional text fields and turns blanks into null so they can be cleared. */
function cleanText<T extends object>(dto: T, keys: (keyof T)[]): T {
  const out = { ...dto };
  for (const k of keys) {
    const v = out[k];
    if (v === null || typeof v === 'string') (out[k] as unknown) = blankToNull(v as string | null);
  }
  return out;
}

const SUPPLIER_TEXT: (keyof CreateSupplierDto)[] = ['contactPerson', 'phone', 'address', 'village', 'description'];
const SCHEME_TEXT: (keyof CreateSchemeDto)[] = ['benefits', 'eligibility', 'howToApply', 'documents', 'applyUrl', 'helpline', 'state'];

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminDirectoryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ---------- Suppliers ----------

  @Get('suppliers')
  async suppliers(@Query() q: AdminSupplierQueryDto) {
    const { skip, take, page, pageSize } = pageArgs(q);
    const where: Prisma.SupplierWhereInput = {
      ...(q.category ? { categories: { has: q.category } } : {}),
      ...(q.district ? { district: { equals: q.district, mode: 'insensitive' } } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: 'insensitive' } },
              { phone: { contains: q.search } },
              { village: { contains: q.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({ where, orderBy: [{ district: 'asc' }, { name: 'asc' }], skip, take }),
      this.prisma.supplier.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  @Post('suppliers')
  async createSupplier(@CurrentUser() admin: AuthUser, @Body() dto: CreateSupplierDto) {
    const supplier = await this.prisma.supplier.create({
      data: { ...cleanText(dto, SUPPLIER_TEXT), name: dto.name.trim(), district: dto.district.trim(), state: dto.state.trim() },
    });
    await this.audit.log(admin.id, 'supplier.create', 'supplier', supplier.id, dto);
    return supplier;
  }

  @Put('suppliers/:id')
  async updateSupplier(@CurrentUser() admin: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSupplierDto) {
    const before = await this.findSupplier(id);
    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...cleanText(dto, SUPPLIER_TEXT),
        name: dto.name?.trim(),
        district: dto.district?.trim(),
        state: dto.state?.trim(),
      },
    });
    await this.audit.log(admin.id, 'supplier.update', 'supplier', id, { before, after: dto });
    return supplier;
  }

  @Delete('suppliers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSupplier(@CurrentUser() admin: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const before = await this.findSupplier(id);
    await this.prisma.supplier.delete({ where: { id } });
    await this.audit.log(admin.id, 'supplier.delete', 'supplier', id, { before });
  }

  // ---------- Government schemes ----------

  @Get('schemes')
  async schemes(@Query() q: AdminSchemeQueryDto) {
    const { skip, take, page, pageSize } = pageArgs(q);
    const where: Prisma.GovernmentSchemeWhereInput = { category: q.category, language: q.language };
    const [items, total] = await Promise.all([
      this.prisma.governmentScheme.findMany({ where, orderBy: [{ updatedAt: 'desc' }], skip, take }),
      this.prisma.governmentScheme.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  @Post('schemes')
  async createScheme(@CurrentUser() admin: AuthUser, @Body() dto: CreateSchemeDto) {
    const scheme = await this.prisma.governmentScheme.create({
      data: {
        ...cleanText(dto, SCHEME_TEXT),
        publishedAt: dto.isPublished ? new Date() : null,
        createdById: admin.id,
      },
    });
    await this.audit.log(admin.id, 'scheme.create', 'government_scheme', scheme.id, dto);
    return scheme;
  }

  @Put('schemes/:id')
  async updateScheme(@CurrentUser() admin: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSchemeDto) {
    const before = await this.findScheme(id);
    const publishing = dto.isPublished === true && !before.isPublished;
    const scheme = await this.prisma.governmentScheme.update({
      where: { id },
      data: {
        ...cleanText(dto, SCHEME_TEXT),
        ...(publishing ? { publishedAt: new Date() } : dto.isPublished === false ? { publishedAt: null } : {}),
      },
    });
    await this.audit.log(admin.id, 'scheme.update', 'government_scheme', id, { before, after: dto });
    return scheme;
  }

  @Delete('schemes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteScheme(@CurrentUser() admin: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const before = await this.findScheme(id);
    await this.prisma.governmentScheme.delete({ where: { id } });
    await this.audit.log(admin.id, 'scheme.delete', 'government_scheme', id, { before });
  }

  private async findSupplier(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  private async findScheme(id: string) {
    const scheme = await this.prisma.governmentScheme.findUnique({ where: { id } });
    if (!scheme) throw new NotFoundException('Scheme not found');
    return scheme;
  }
}
