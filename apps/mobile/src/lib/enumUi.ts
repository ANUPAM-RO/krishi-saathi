import type { ActivityType, ExpenseCategory, FarmerCropStatus, NotificationType } from '@krishi/shared';
import type { IconName } from '@/components/Icon';
import { colors } from '@/theme';

export const ACTIVITY_ICONS: Record<ActivityType, IconName> = {
  LAND_PREPARATION: 'hammer',
  SOWING: 'leaf',
  TRANSPLANTING: 'flower',
  IRRIGATION: 'water',
  FERTILIZER: 'flask',
  WEEDING: 'cut',
  PEST_CONTROL: 'bug',
  HARVEST: 'basket',
  OTHER: 'clipboard',
};

export const EXPENSE_ICONS: Record<ExpenseCategory, IconName> = {
  SEED: 'leaf',
  FERTILIZER: 'flask',
  PESTICIDE: 'bug',
  LABOUR: 'people',
  IRRIGATION: 'water',
  MACHINERY: 'construct',
  TRANSPORT: 'car',
  OTHER: 'ellipsis-horizontal-circle',
};

export const NOTIFICATION_ICONS: Record<NotificationType, IconName> = {
  CROP_REMINDER: 'alarm',
  WEATHER_ALERT: 'thunderstorm',
  PRICE_ALERT: 'pricetag',
  ADVISORY: 'bulb',
  GENERAL: 'chatbubble-ellipses',
};

export const STATUS_COLORS: Record<FarmerCropStatus, string> = {
  PLANNED: colors.info,
  ACTIVE: colors.primary,
  HARVESTED: colors.accent,
  FAILED: colors.danger,
};
