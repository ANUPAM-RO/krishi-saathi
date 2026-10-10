import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/configuration';

/** Sends OTP codes by SMS. "console" only logs (development); "msg91" uses the MSG91 OTP API. */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    if (this.config.smsProvider === 'console') {
      this.logger.log(`[dev] OTP for ${phone}: ${code}`);
      return;
    }

    const { msg91AuthKey, msg91TemplateId } = this.config;
    if (!msg91AuthKey || !msg91TemplateId) throw new ServiceUnavailableException('SMS provider is not configured');

    const url = new URL('https://control.msg91.com/api/v5/otp');
    url.searchParams.set('template_id', msg91TemplateId);
    url.searchParams.set('mobile', phone.replace('+', ''));
    url.searchParams.set('otp', code);
    const res = await fetch(url, {
      method: 'POST',
      headers: { authkey: msg91AuthKey, 'content-type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    }).catch((err: Error) => {
      this.logger.error(`MSG91 request failed: ${err.message}`);
      return null;
    });
    if (!res || !res.ok) {
      this.logger.error(`MSG91 returned ${res?.status ?? 'no response'}`);
      throw new ServiceUnavailableException('Could not send OTP right now. Please try again.');
    }
  }
}
