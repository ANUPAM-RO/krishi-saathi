import { Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Language, Prisma, WeatherRecord } from '@prisma/client';
import { APP_CONFIG, AppConfig } from '../config/configuration';
import { renderMessage } from '../common/i18n/messages';
import { PrismaService } from '../prisma/prisma.service';

export interface WeatherLocation {
  latitude: number;
  longitude: number;
  label: string;
  farmId?: string;
}

export interface WeatherCurrent {
  temperature: number | null;
  humidity: number | null;
  rainProbability: number | null;
  rainfall: number | null;
  windSpeed: number | null;
  weatherCode: number | null;
  observedAt: string;
}

export interface WeatherDay {
  date: string;
  tempMin: number | null;
  tempMax: number | null;
  rainProbability: number | null;
  rainfall: number | null;
  windSpeedMax: number | null;
  weatherCode: number | null;
}

interface StoredForecast {
  weatherCode: number | null;
  observedAt: string;
  daily: WeatherDay[];
}

export interface WeatherSnapshot {
  location: WeatherLocation;
  current: WeatherCurrent;
  daily: WeatherDay[];
  fetchedAt: Date;
  isStale: boolean;
  source: string;
}

/** Used when a farmer has no farm location yet: the approximate centre of West Bengal. */
const DEFAULT_LOCATION: WeatherLocation = { latitude: 22.9868, longitude: 87.855, label: 'West Bengal' };

/** Heavy-rain heuristic used for automatic alerts. */
export const HEAVY_RAIN = { minProbability: 70, minRainfallMm: 20 };

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly geocodeCache = new Map<string, Promise<WeatherLocation | null>>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async resolveLocation(userId: string, opts: { farmId?: string; lat?: number; lon?: number }): Promise<WeatherLocation> {
    if (opts.lat !== undefined && opts.lon !== undefined) {
      return { latitude: opts.lat, longitude: opts.lon, label: `${opts.lat.toFixed(2)}, ${opts.lon.toFixed(2)}` };
    }

    const farm = opts.farmId
      ? await this.prisma.farm.findFirst({ where: { id: opts.farmId, userId } })
      : await this.prisma.farm.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
    if (opts.farmId && !farm) throw new NotFoundException('Farm not found');

    if (farm?.latitude != null && farm.longitude != null) {
      return { latitude: farm.latitude, longitude: farm.longitude, label: farm.village || farm.name, farmId: farm.id };
    }

    const place =
      farm ??
      (await this.prisma.user.findUnique({ where: { id: userId }, select: { district: true, village: true, state: true } }));

    // The geocoder knows towns better than district names, so try the most specific name first.
    for (const name of geocodeCandidates(place?.village, place?.district)) {
      const geo = await this.geocode(name, place?.state ?? null);
      if (geo) return { ...geo, farmId: farm?.id };
    }
    return { ...DEFAULT_LOCATION, farmId: farm?.id };
  }

  /** Cached weather for a location; falls back to the last known snapshot if the provider fails. */
  async getSnapshot(location: WeatherLocation): Promise<WeatherSnapshot> {
    const locationKey = `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`;
    const freshSince = new Date(Date.now() - this.config.weatherCacheMinutes * 60 * 1000);

    const cached = await this.prisma.weatherRecord.findFirst({
      where: { locationKey, fetchedAt: { gte: freshSince } },
      orderBy: { fetchedAt: 'desc' },
    });
    if (cached) return this.fromRecord(cached, location, false);

    try {
      const fetched = await this.fetchOpenMeteo(location);
      const record = await this.prisma.weatherRecord.create({
        data: {
          farmId: location.farmId,
          locationKey,
          temperature: fetched.current.temperature,
          humidity: fetched.current.humidity,
          rainProbability: fetched.current.rainProbability,
          rainfall: fetched.current.rainfall,
          windSpeed: fetched.current.windSpeed,
          weatherDate: new Date(fetched.current.observedAt),
          forecast: {
            weatherCode: fetched.current.weatherCode,
            observedAt: fetched.current.observedAt,
            daily: fetched.daily,
          } satisfies StoredForecast as unknown as Prisma.InputJsonValue,
          source: 'open-meteo',
        },
      });
      return this.fromRecord(record, location, false);
    } catch (err) {
      this.logger.warn(`Weather provider failed for ${locationKey}: ${(err as Error).message}`);
      const last = await this.prisma.weatherRecord.findFirst({ where: { locationKey }, orderBy: { fetchedAt: 'desc' } });
      if (last) return this.fromRecord(last, location, true);
      throw new ServiceUnavailableException('Weather is unavailable right now. Please try again later.');
    }
  }

  /** Admin-published alerts for the farmer's region, plus automatic heavy-rain alerts from the forecast. */
  async alertsFor(userId: string, location: WeatherLocation, daily: WeatherDay[], language: Language) {
    const farm = location.farmId
      ? await this.prisma.farm.findUnique({ where: { id: location.farmId }, select: { state: true, district: true } })
      : await this.prisma.user.findUnique({ where: { id: userId }, select: { state: true, district: true } });
    const now = new Date();
    const regionMatch = (field: 'state' | 'district', value?: string | null): Prisma.WeatherAlertWhereInput =>
      value
        ? { OR: [{ [field]: null }, { [field]: { equals: value, mode: 'insensitive' } }] }
        : { [field]: null };

    const published = await this.prisma.weatherAlert.findMany({
      where: {
        language,
        validTo: { gte: now },
        validFrom: { lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
        AND: [regionMatch('state', farm?.state), regionMatch('district', farm?.district)],
      },
      orderBy: [{ severity: 'desc' }, { validFrom: 'asc' }],
      select: {
        id: true,
        severity: true,
        title: true,
        message: true,
        validFrom: true,
        validTo: true,
        district: true,
        state: true,
        cropId: true,
      },
    });

    const automatic = daily
      .filter(
        (d) =>
          (d.rainProbability ?? 0) >= HEAVY_RAIN.minProbability && (d.rainfall ?? 0) >= HEAVY_RAIN.minRainfallMm,
      )
      .slice(0, 3)
      .map((d) => {
        const text = renderMessage('heavyRain', language, {
          rain: Math.round(d.rainfall ?? 0),
          prob: d.rainProbability ?? 0,
          place: location.label,
        });
        return {
          id: `auto-rain-${d.date}`,
          severity: 'WARNING' as const,
          title: `${text.title} (${d.date})`,
          message: text.body,
          validFrom: new Date(`${d.date}T00:00:00+05:30`),
          validTo: new Date(`${d.date}T23:59:59+05:30`),
          district: null,
          state: null,
          cropId: null,
        };
      });

    return [...published, ...automatic];
  }

  private fromRecord(record: WeatherRecord, location: WeatherLocation, isStale: boolean): WeatherSnapshot {
    const stored = (record.forecast ?? { weatherCode: null, observedAt: record.weatherDate.toISOString(), daily: [] }) as unknown as StoredForecast;
    return {
      location: { latitude: location.latitude, longitude: location.longitude, label: location.label },
      current: {
        temperature: record.temperature,
        humidity: record.humidity,
        rainProbability: record.rainProbability,
        rainfall: record.rainfall,
        windSpeed: record.windSpeed,
        weatherCode: stored.weatherCode,
        observedAt: stored.observedAt,
      },
      daily: stored.daily,
      fetchedAt: record.fetchedAt,
      isStale,
      source: record.source,
    };
  }

  private async fetchOpenMeteo(location: WeatherLocation): Promise<{ current: WeatherCurrent; daily: WeatherDay[] }> {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(location.latitude));
    url.searchParams.set('longitude', String(location.longitude));
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m');
    url.searchParams.set(
      'daily',
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max',
    );
    url.searchParams.set('timezone', 'Asia/Kolkata');
    url.searchParams.set('forecast_days', '7');

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);
    const body = (await res.json()) as OpenMeteoResponse;

    const d = body.daily;
    const daily: WeatherDay[] = d.time.map((date, i) => ({
      date,
      tempMin: d.temperature_2m_min[i] ?? null,
      tempMax: d.temperature_2m_max[i] ?? null,
      rainProbability: d.precipitation_probability_max[i] ?? null,
      rainfall: d.precipitation_sum[i] ?? null,
      windSpeedMax: d.wind_speed_10m_max[i] ?? null,
      weatherCode: d.weather_code[i] ?? null,
    }));

    return {
      current: {
        temperature: body.current.temperature_2m ?? null,
        humidity: body.current.relative_humidity_2m ?? null,
        rainProbability: daily[0]?.rainProbability ?? null,
        rainfall: body.current.precipitation ?? null,
        windSpeed: body.current.wind_speed_10m ?? null,
        weatherCode: body.current.weather_code ?? null,
        // Open-Meteo returns local time without an offset when a timezone is requested.
        observedAt: new Date(`${body.current.time}:00+05:30`).toISOString(),
      },
      daily,
    };
  }

  private geocode(name: string, state: string | null): Promise<WeatherLocation | null> {
    const key = `${name}|${state ?? ''}`.toLowerCase();
    if (!this.geocodeCache.has(key)) {
      const lookup = (async () => {
        try {
          const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
          url.searchParams.set('name', name);
          url.searchParams.set('count', '10');
          url.searchParams.set('country_code', 'IN');
          const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (!res.ok) return null;
          const body = (await res.json()) as { results?: { latitude: number; longitude: number; name: string; admin1?: string }[] };
          const results = body.results ?? [];
          const match =
            results.find((r) => state && r.admin1?.toLowerCase() === state.toLowerCase()) ?? results[0];
          return match ? { latitude: match.latitude, longitude: match.longitude, label: match.name } : null;
        } catch {
          return null;
        }
      })();
      this.geocodeCache.set(key, lookup);
      // Don't cache failures forever.
      lookup.then((r) => r === null && this.geocodeCache.delete(key));
    }
    return this.geocodeCache.get(key)!;
  }
}

/** "Purba Bardhaman" → ["Memari", "Purba Bardhaman", "Bardhaman"]: village, district, then district without a direction prefix. */
export function geocodeCandidates(village?: string | null, district?: string | null): string[] {
  const names = [village, district];
  if (district) {
    names.push(
      district
        .replace(/^(purba|paschim|uttar|dakshin|north|south|east|west)\s+/i, '')
        .replace(/\s+district$/i, ''),
    );
  }
  return [...new Set(names.map((n) => n?.trim()).filter((n): n is string => !!n))];
}

interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m?: number;
    relative_humidity_2m?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily: {
    time: string[];
    weather_code: (number | null)[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_sum: (number | null)[];
    precipitation_probability_max: (number | null)[];
    wind_speed_10m_max: (number | null)[];
  };
}
