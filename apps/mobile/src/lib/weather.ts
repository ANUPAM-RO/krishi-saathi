import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

export type WeatherCodeKey =
  | 'clear'
  | 'mainlyClear'
  | 'partlyCloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavyRain'
  | 'freezingRain'
  | 'snow'
  | 'showers'
  | 'thunderstorm'
  | 'unknown';

export interface WeatherVisual {
  key: WeatherCodeKey;
  icon: IconName;
  color: string;
  rainy: boolean;
}

/** WMO weather interpretation codes (as returned by Open-Meteo) → icon and label key. */
export function weatherVisual(code: number | null | undefined): WeatherVisual {
  const c = code ?? -1;
  if (c === 0) return { key: 'clear', icon: 'sunny', color: '#F9A825', rainy: false };
  if (c === 1) return { key: 'mainlyClear', icon: 'partly-sunny', color: '#F9A825', rainy: false };
  if (c === 2) return { key: 'partlyCloudy', icon: 'partly-sunny', color: '#78909C', rainy: false };
  if (c === 3) return { key: 'overcast', icon: 'cloudy', color: '#607D8B', rainy: false };
  if (c === 45 || c === 48) return { key: 'fog', icon: 'cloud', color: '#90A4AE', rainy: false };
  if (c >= 51 && c <= 55) return { key: 'drizzle', icon: 'rainy-outline', color: '#1E88E5', rainy: true };
  if (c === 56 || c === 57 || c === 66 || c === 67)
    return { key: 'freezingRain', icon: 'rainy', color: '#1E88E5', rainy: true };
  if (c === 61 || c === 63) return { key: 'rain', icon: 'rainy', color: '#1565C0', rainy: true };
  if (c === 65) return { key: 'heavyRain', icon: 'rainy', color: '#0D47A1', rainy: true };
  if (c >= 71 && c <= 77) return { key: 'snow', icon: 'snow', color: '#90CAF9', rainy: false };
  if (c >= 80 && c <= 82) return { key: 'showers', icon: 'rainy', color: '#1565C0', rainy: true };
  if (c === 85 || c === 86) return { key: 'snow', icon: 'snow', color: '#90CAF9', rainy: false };
  if (c >= 95 && c <= 99) return { key: 'thunderstorm', icon: 'thunderstorm', color: '#4527A0', rainy: true };
  return { key: 'unknown', icon: 'partly-sunny-outline', color: '#78909C', rainy: false };
}

/** A day counts as a rain day for alerts when rain is likely or already forecast in quantity. */
export function isRainDay(day: { rainProbability: number; rainfall: number; weatherCode: number }): boolean {
  return day.rainProbability >= 60 || day.rainfall >= 5 || (weatherVisual(day.weatherCode).rainy && day.rainProbability >= 40);
}
