import type { TFunction } from 'i18next';
import { isApiError } from '@/api/client';

/** Turn any thrown error into a short, localized sentence a farmer can act on. */
export function errorMessage(error: unknown, t: TFunction): string {
  if (!isApiError(error)) return t('errors.generic');
  switch (error.kind) {
    case 'network':
      return t('errors.network');
    case 'timeout':
      return t('errors.timeout');
    case 'auth':
      return t('errors.sessionExpired');
    default:
      break;
  }
  if (error.status === 404) return t('errors.notFound');
  if (error.status === 429) return t('errors.tooMany');
  if (error.status === 503 || error.status >= 500) return t('errors.server');
  if (error.status === 400 || error.status === 422) return t('errors.badRequest');
  return t('errors.generic');
}
