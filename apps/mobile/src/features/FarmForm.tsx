import { AREA_UNITS, SOIL_TYPES, type AreaUnit, type SoilType } from '@krishi/shared';
import * as Location from 'expo-location';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSaveFarm } from '@/api/hooks';
import type { Farm, FarmBody } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { AppText, Button, Card, Chips, FormError, Icon, Segmented, TextField, ToggleRow } from '@/components';
import { errorMessage } from '@/lib/errors';
import { parseDecimal } from '@/lib/format';
import { colors, spacing } from '@/theme';
import { DEFAULT_STATE } from './ProfileForm';

export interface FarmFormProps {
  farm?: Farm;
  onSaved: (farm: Farm) => void;
  submitLabel?: string;
  /** Extra actions under the Save button (e.g. Skip). */
  extra?: ReactNode;
}

type LocationState = { lat: number; lon: number } | null;

export function FarmForm({ farm, onSaved, submitLabel, extra }: FarmFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [name, setName] = useState(farm?.name ?? '');
  const [area, setArea] = useState(farm ? String(farm.area) : '');
  const [unit, setUnit] = useState<AreaUnit>(farm?.areaUnit ?? 'BIGHA');
  const [village, setVillage] = useState(farm ? (farm.village ?? '') : (user?.village ?? ''));
  const [district, setDistrict] = useState(farm ? (farm.district ?? '') : (user?.district ?? ''));
  const [state, setState] = useState(farm ? (farm.state ?? DEFAULT_STATE) : (user?.state || DEFAULT_STATE));
  const [soil, setSoil] = useState<SoilType | null>(farm?.soilType ?? null);
  const [irrigation, setIrrigation] = useState(farm?.irrigationAvailable ?? false);
  const [location, setLocation] = useState<LocationState>(
    farm?.latitude != null && farm?.longitude != null ? { lat: farm.latitude, lon: farm.longitude } : null,
  );
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; area?: string }>({});
  const mutation = useSaveFarm();

  const captureLocation = async () => {
    setLocationError(null);
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setLocationError(t('errors.locationDenied'));
        return;
      }
      let pos: Location.LocationObject | null = null;
      try {
        pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 20000)),
        ]);
      } catch {
        pos = null;
      }
      if (!pos) pos = await Location.getLastKnownPositionAsync().catch(() => null);
      if (!pos) {
        setLocationError(t('errors.locationFailed'));
        return;
      }
      setLocation({
        lat: Math.round(pos.coords.latitude * 1e6) / 1e6,
        lon: Math.round(pos.coords.longitude * 1e6) / 1e6,
      });
    } catch {
      setLocationError(t('errors.locationFailed'));
    } finally {
      setLocating(false);
    }
  };

  const submit = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = t('errors.required');
    const areaNum = parseDecimal(area);
    if (areaNum == null) next.area = t('errors.required');
    else if (Number.isNaN(areaNum)) next.area = t('errors.invalidNumber');
    else if (areaNum <= 0) next.area = t('errors.positiveNumber');
    setErrors(next);
    if (Object.keys(next).length || areaNum == null) return;

    const body: FarmBody = {
      name: name.trim(),
      area: areaNum,
      areaUnit: unit,
      village: village.trim() || undefined,
      district: district.trim() || undefined,
      state: state.trim() || undefined,
      irrigationAvailable: irrigation,
    };
    if (location) {
      body.latitude = location.lat;
      body.longitude = location.lon;
    } else if (farm?.latitude != null) {
      body.latitude = null;
      body.longitude = null;
    }
    if (soil) body.soilType = soil;
    else if (farm?.soilType) body.soilType = null;

    mutation.mutate({ id: farm?.id, body }, { onSuccess: onSaved });
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <TextField
        label={t('farms.name')}
        placeholder={t('farms.namePlaceholder')}
        value={name}
        onChangeText={setName}
        error={errors.name}
      />
      <TextField
        label={t('farms.area')}
        value={area}
        onChangeText={setArea}
        keyboardType="decimal-pad"
        placeholder="0"
        error={errors.area}
      />
      <Segmented
        label={t('farms.unit')}
        value={unit}
        onChange={setUnit}
        options={AREA_UNITS.map((u) => ({ value: u, label: t(`enums.areaUnit.${u}`) }))}
      />
      <TextField
        label={t('profile.village')}
        optionalLabel={t('common.optional')}
        value={village}
        onChangeText={setVillage}
      />
      <TextField
        label={t('profile.district')}
        optionalLabel={t('common.optional')}
        value={district}
        onChangeText={setDistrict}
      />
      <TextField label={t('profile.state')} value={state} onChangeText={setState} />

      <Card tone="info">
        <View style={styles.row}>
          <Icon name="location" size={26} color={colors.info} />
          <AppText variant="large" bold style={{ flex: 1 }}>
            {t('farms.location')}
          </AppText>
        </View>
        {location ? (
          <>
            <AppText bold color={colors.primaryDark}>
              {`✓ ${t('farms.locationSaved')} (${location.lat.toFixed(4)}, ${location.lon.toFixed(4)})`}
            </AppText>
            <Button
              title={t('farms.removeLocation')}
              variant="ghost"
              size="medium"
              icon="close-circle"
              onPress={() => setLocation(null)}
            />
          </>
        ) : (
          <>
            <AppText variant="small" muted>
              {t('farms.locationHint')}
            </AppText>
            <Button
              title={locating ? t('farms.gettingLocation') : t('farms.useLocation')}
              variant="outline"
              size="medium"
              icon="navigate"
              loading={locating}
              onPress={captureLocation}
            />
          </>
        )}
        {locationError ? (
          <AppText variant="small" color={colors.warning}>
            {locationError}
          </AppText>
        ) : null}
      </Card>

      <Chips
        label={`${t('farms.soil')} (${t('common.optional')})`}
        value={soil}
        onChange={(v) => setSoil(v === soil ? null : v)}
        options={SOIL_TYPES.map((s) => ({ value: s, label: t(`enums.soilType.${s}`) }))}
      />
      <ToggleRow label={t('farms.irrigation')} value={irrigation} onChange={setIrrigation} icon="water" />

      <FormError message={mutation.isError ? errorMessage(mutation.error, t) : null} />
      <Button title={submitLabel ?? t('common.save')} icon="checkmark" onPress={submit} loading={mutation.isPending} />
      {extra}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
