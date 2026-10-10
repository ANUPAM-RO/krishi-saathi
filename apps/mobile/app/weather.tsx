import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { isApiError } from '@/api/client';
import type { WeatherQuery } from '@/api/endpoints';
import { useFarms, useWeatherCurrent, useWeatherForecast } from '@/api/hooks';
import type { WeatherAlert, WeatherDay } from '@/api/types';
import {
  AppText,
  Button,
  Card,
  Chips,
  EmptyState,
  Icon,
  LoadingState,
  QueryBoundary,
  Screen,
  SectionHeader,
} from '@/components';
import { StaleWarning, WeatherNow } from '@/features/Cards';
import { formatDate, formatRelativeDay, formatTimeAgo, weekdayName } from '@/lib/format';
import { LocationError, useDeviceLocation } from '@/lib/location';
import { isRainDay, weatherVisual } from '@/lib/weather';
import { colors, radius, spacing } from '@/theme';

const MY_LOCATION = '__me__';

export default function WeatherScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ farmId?: string }>();
  const farms = useFarms();
  const device = useDeviceLocation();
  const coords = device.coords;
  const [selected, setSelected] = useState<string | null>(params.farmId ?? null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const farmList = farms.data ?? [];
  // Default to the phone's live location; fall back to the first farm when it is unavailable.
  const choice = selected ?? (coords ? MY_LOCATION : farmList[0]?.id);
  const usingGps = choice === MY_LOCATION && !!coords;
  const q: WeatherQuery = usingGps ? { lat: coords.lat, lon: coords.lon } : choice ? { farmId: choice } : {};
  const waitingForGps = !selected && device.isPending;
  const hasTarget = !waitingForGps && (!!q.farmId || q.lat != null);

  const current = useWeatherCurrent(q, hasTarget);
  const forecast = useWeatherForecast(q, hasTarget);

  const captureMyLocation = async () => {
    setLocationError(null);
    try {
      await device.refresh();
      setSelected(MY_LOCATION);
    } catch (e) {
      setLocationError(
        t(e instanceof LocationError && e.reason === 'denied' ? 'errors.locationDenied' : 'errors.locationFailed'),
      );
    }
  };

  const weatherError = (e: unknown) =>
    isApiError(e) && (e.status === 503 || e.status >= 500) ? t('errors.weatherUnavailable') : undefined;

  const refresh = () => {
    void farms.refetch();
    void current.refetch();
    void forecast.refetch();
  };

  const options = [
    ...(coords ? [{ value: MY_LOCATION, label: t('weather.myLocation'), icon: 'navigate' as const }] : []),
    ...farmList.map((f) => ({ value: f.id, label: f.name, icon: 'map' as const })),
  ];

  return (
    <Screen onRefresh={refresh} refreshing={current.isRefetching || forecast.isRefetching}>
      {options.length > 1 ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label">{t('weather.chooseFarm')}</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Chips value={choice ?? null} onChange={setSelected} options={options} />
          </ScrollView>
        </View>
      ) : null}
      <Button
        title={t('weather.useMyLocation')}
        variant="outline"
        size="medium"
        icon="navigate"
        loading={device.isLocating}
        onPress={captureMyLocation}
      />
      {locationError ? (
        <AppText variant="small" color={colors.warning} bold>
          {locationError}
        </AppText>
      ) : null}

      {waitingForGps ? (
        <LoadingState />
      ) : !hasTarget ? (
        <QueryBoundary query={farms}>
          {() => <EmptyState icon="partly-sunny-outline" message={t('weather.noFarm')} />}
        </QueryBoundary>
      ) : (
        <>
          <QueryBoundary query={current} errorText={weatherError}>
            {(data) => (
              <WeatherNow
                current={data.current}
                fetchedAt={data.fetchedAt}
                isStale={data.isStale}
                label={usingGps ? t('weather.myLocation') : data.location.label}
              />
            )}
          </QueryBoundary>
          <QueryBoundary query={forecast} errorText={weatherError}>
            {(data) => <Forecast days={data.daily} alerts={data.alerts} fetchedAt={data.fetchedAt} isStale={data.isStale} />}
          </QueryBoundary>
        </>
      )}
    </Screen>
  );
}

function Forecast({
  days,
  alerts,
  fetchedAt,
  isStale,
}: {
  days: WeatherDay[];
  alerts: WeatherAlert[];
  fetchedAt: string;
  isStale: boolean;
}) {
  const { t } = useTranslation();
  const rainDays = days.filter(isRainDay);

  return (
    <>
      {rainDays.length > 0 ? (
        <Card tone="info">
          <View style={styles.row}>
            <Icon name="umbrella" size={30} color={colors.info} />
            <AppText bold style={{ flex: 1 }}>
              {t('weather.rainAlert', {
                days: rainDays.map((d) => `${weekdayName(d.date, t)} ${formatDate(d.date, t, { short: true })}`).join(', '),
              })}
            </AppText>
          </View>
        </Card>
      ) : null}

      {alerts.length > 0 ? (
        <>
          <SectionHeader title={t('weather.alerts')} icon="warning" />
          {alerts.map((a) => (
            <Card key={a.id} tone={a.severity === 'SEVERE' ? 'danger' : a.severity === 'WARNING' ? 'warning' : 'info'}>
              <View style={styles.row}>
                <Icon
                  name={a.severity === 'INFO' ? 'information-circle' : 'warning'}
                  size={26}
                  color={a.severity === 'SEVERE' ? colors.danger : a.severity === 'WARNING' ? colors.warning : colors.info}
                />
                <AppText variant="large" bold style={{ flex: 1 }}>
                  {`${t(`weather.severity.${a.severity}`)}: ${a.title}`}
                </AppText>
              </View>
              <AppText>{a.message}</AppText>
              <AppText variant="small" muted>
                {t('weather.validTill', { date: formatDate(a.validTo, t) })}
              </AppText>
            </Card>
          ))}
        </>
      ) : null}

      <SectionHeader title={t('weather.forecast')} icon="calendar" />
      {isStale ? <StaleWarning /> : null}
      <Card style={{ gap: 0, paddingVertical: spacing.sm }}>
        {days.map((d, i) => {
          const v = weatherVisual(d.weatherCode);
          return (
            <View key={d.date} style={[styles.day, i > 0 && styles.dayBorder]}>
              <View style={{ width: 84 }}>
                <AppText bold>{i === 0 ? formatRelativeDay(d.date, t) : weekdayName(d.date, t)}</AppText>
                <AppText variant="small" muted>
                  {formatDate(d.date, t, { short: true })}
                </AppText>
              </View>
              <Icon name={v.icon} size={32} color={v.color} />
              <View style={{ flex: 1 }}>
                <AppText variant="small" bold numberOfLines={1}>
                  {t(`weather.codes.${v.key}`)}
                </AppText>
                <View style={styles.row}>
                  <Icon name="umbrella" size={14} color={colors.info} />
                  <AppText variant="small" color={colors.info} bold>
                    {`${Math.round(d.rainProbability)}%`}
                  </AppText>
                  {d.rainfall > 0 ? (
                    <AppText variant="small" muted>{`${Math.round(d.rainfall * 10) / 10} mm`}</AppText>
                  ) : null}
                </View>
              </View>
              <View style={styles.temps}>
                <AppText bold>{`${Math.round(d.tempMax)}°`}</AppText>
                <AppText variant="small" muted>{`${Math.round(d.tempMin)}°`}</AppText>
              </View>
            </View>
          );
        })}
      </Card>
      <AppText variant="small" muted>
        {t('time.updated', { time: formatTimeAgo(fetchedAt, t) })}
      </AppText>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  day: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  dayBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  temps: { alignItems: 'flex-end', minWidth: 44, borderRadius: radius.sm },
});
