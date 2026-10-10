import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { serializeDecimals } from '../interceptors/serialize.interceptor';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Records an admin change. Failures are logged but never break the request. */
  async log(actorId: string | null, action: string, entity: string, entityId: string | null, changes?: unknown) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action,
          entity,
          entityId,
          changes: changes === undefined ? undefined : (serializeDecimals(changes) as Prisma.InputJsonValue),
        },
      });
    } catch (err) {
      this.logger.error(`Failed to write audit log for ${action}`, err as Error);
    }
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
