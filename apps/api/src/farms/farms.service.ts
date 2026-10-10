import { Injectable, NotFoundException } from '@nestjs/common';
import { FarmerCropStatus } from '@prisma/client';
import { FarmerCropsService } from '../farmer-crops/farmer-crops.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFarmDto, UpdateFarmDto } from './dto';

const ACTIVE_STATUSES: FarmerCropStatus[] = ['ACTIVE', 'PLANNED'];

@Injectable()
export class FarmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly farmerCrops: FarmerCropsService,
  ) {}

  async list(userId: string) {
    const farms = await this.prisma.farm.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { farmerCrops: { where: { status: { in: ACTIVE_STATUSES } } } } } },
    });
    return farms.map(({ _count, userId: _u, ...farm }) => ({ ...farm, activeCropCount: _count.farmerCrops }));
  }

  async get(userId: string, id: string) {
    const farm = await this.findOwned(userId, id);
    const farmerCrops = await this.farmerCrops.list(userId, { farmId: id });
    const { userId: _u, ...rest } = farm;
    return {
      ...rest,
      activeCropCount: farmerCrops.filter((c) => ACTIVE_STATUSES.includes(c.status)).length,
      farmerCrops,
    };
  }

  async create(userId: string, dto: CreateFarmDto) {
    const farm = await this.prisma.farm.create({ data: { ...this.clean(dto), userId } as never });
    const { userId: _u, ...rest } = farm;
    return { ...rest, activeCropCount: 0 };
  }

  async update(userId: string, id: string, dto: UpdateFarmDto) {
    await this.findOwned(userId, id);
    await this.prisma.farm.update({ where: { id }, data: this.clean(dto) });
    return (await this.list(userId)).find((f) => f.id === id)!;
  }

  async remove(userId: string, id: string) {
    await this.findOwned(userId, id);
    await this.prisma.farm.delete({ where: { id } });
  }

  private async findOwned(userId: string, id: string) {
    const farm = await this.prisma.farm.findFirst({ where: { id, userId } });
    if (!farm) throw new NotFoundException('Farm not found');
    return farm;
  }

  private clean<T extends Partial<CreateFarmDto>>(dto: T): T {
    const trim = (v?: string | null) => (v === undefined ? undefined : v?.trim() || null);
    return {
      ...dto,
      name: dto.name?.trim(),
      village: trim(dto.village),
      district: trim(dto.district),
      state: trim(dto.state),
    } as T;
  }
}
