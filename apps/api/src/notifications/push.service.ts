import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

/**
 * Delivers push notifications through the Expo push service, which uses
 * Firebase Cloud Messaging for Android devices.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async send(messages: PushMessage[]): Promise<void> {
    const valid = messages.filter((m) => /^Expo(nent)?PushToken\[.+\]$/.test(m.to));
    if (!valid.length) return;
    if (!this.config.pushEnabled) {
      this.logger.debug(`Push disabled; skipping ${valid.length} message(s)`);
      return;
    }

    for (let i = 0; i < valid.length; i += CHUNK_SIZE) {
      const chunk = valid.slice(i, i + CHUNK_SIZE);
      try {
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            ...(this.config.expoAccessToken ? { authorization: `Bearer ${this.config.expoAccessToken}` } : {}),
          },
          body: JSON.stringify(chunk.map((m) => ({ ...m, sound: 'default', channelId: 'default', priority: 'high' }))),
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
          this.logger.warn(`Expo push responded ${res.status}`);
          continue;
        }
        const body = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
        const stale = (body.data ?? [])
          .map((ticket, idx) => (ticket.details?.error === 'DeviceNotRegistered' ? chunk[idx]?.to : null))
          .filter((t): t is string => !!t);
        if (stale.length) await this.prisma.deviceToken.deleteMany({ where: { token: { in: stale } } });
      } catch (err) {
        this.logger.warn(`Expo push failed: ${(err as Error).message}`);
      }
    }
  }
}
