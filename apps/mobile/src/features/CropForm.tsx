import {
  AREA_UNITS,
  calculateExpectedHarvestDate,
  formatDateOnly,
  roundMoney,
  toAcres,
  type AreaUnit,
} from '@krishi/shared';
import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useCreateFarmerCrop, useCropCatalog, useFarms } from '@/api/hooks';
import type { CreateFarmerCropBody, FarmerCropDetail } from '@/api/types';
import {
  AppText,
  Button,
  Card,
  Chips,
  DatePicker,
  EmptyState,
  FormError,
  Icon,
  QueryBoundary,
  Segmented,
  TextField,
} from '@/components';
import { useLanguage } from '@/i18n/localized';
import { errorMessage } from '@/lib/errors';
import { formatDate, parseDecimal, shiftDay, todayString } from '@/lib/format';
import { colors, spacing } from '@/theme';

export interface CropFormProps {
  initialFarmId?: string;
  onSaved: (fc: FarmerCropDetail) => void;
  extra?: ReactNode;
}

export function CropForm(props: CropFormProps) {
  const { t } = useTranslation();
  const farmsQuery = useFarms();
  const cropsQuery = useCropCatalog();
  return (
    <QueryBoundary
      query={farmsQuery}
      isEmpty={(farms) => farms.length === 0}
      empty={{
        icon: 'map-outline',
        title: t('farms.none'),
        message: t('crops.needFarm'),
        actionLabel: t('farms.add'),
        onAction: () => router.push('/farms/new'),
      }}
    >
      {() => (
        <QueryBoundary
          query={cropsQuery}
          isEmpty={(crops) => crops.length === 0}
          empty={{ icon: 'leaf-outline', message: t('crops.noCropsAvailable') }}
        >
          {() => <CropFormInner {...props} />}
        </QueryBoundary>
      )}
    </QueryBoundary>
  );
}

function CropFormInner({ initialFarmId, onSaved, extra }: CropFormProps) {
  const { t } = useTranslation();
  const { lang, loc } = useLanguage();
  const farms = useFarms().data ?? [];
  const crops = useCropCatalog().data ?? [];
  const mutation = useCreateFarmerCrop();

  const [farmId, setFarmId] = useState<string | null>(
    initialFarmId && farms.some((f) => f.id === initialFarmId) ? initialFarmId : farms.length === 1 ? farms[0].id : null,
  );
  const [cropId, setCropId] = useState<string | null>(null);
  const [sowingDate, setSowingDate] = useState(todayString());
  const [area, setArea] = useState('');
  const [unit, setUnit] = useState<AreaUnit>('BIGHA');
  const [yieldText, setYieldText] = useState('');
  const [priceText, setPriceText] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const farm = farms.find((f) => f.id === farmId);
  const crop = crops.find((c) => c.id === cropId);

  // Default the crop's land to the whole farm; the farmer can change it.
  useEffect(() => {
    if (farm) {
      setArea((prev) => prev || String(farm.area));
      setUnit(farm.areaUnit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farm?.id]);

  const harvestDate = useMemo(() => {
    if (!crop || crop.durationDays <= 0) return null;
    try {
      return formatDateOnly(calculateExpectedHarvestDate(sowingDate, crop.durationDays));
    } catch {
      return null;
    }
  }, [crop, sowingDate]);

  const areaNum = parseDecimal(area);
  const usualYield =
    crop?.defaultYieldPerAcre != null && areaNum != null && !Number.isNaN(areaNum) && areaNum > 0
      ? roundMoney(crop.defaultYieldPerAcre * toAcres(areaNum, unit))
      : null;

  const sortedCrops = useMemo(
    () => [...crops].sort((a, b) => loc(a).localeCompare(loc(b))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [crops, lang],
  );

  const submit = () => {
    const next: Record<string, string> = {};
    if (!farmId) next.farm = t('errors.selectFarm');
    if (!cropId) next.crop = t('errors.selectCrop');
    if (areaNum == null) next.area = t('errors.required');
    else if (Number.isNaN(areaNum)) next.area = t('errors.invalidNumber');
    else if (areaNum <= 0) next.area = t('errors.positiveNumber');
    const y = parseDecimal(yieldText);
    if (y != null && (Number.isNaN(y) || y < 0)) next.yield = t('errors.invalidNumber');
    const p = parseDecimal(priceText);
    if (p != null && (Number.isNaN(p) || p < 0)) next.price = t('errors.invalidNumber');
    setErrors(next);
    if (Object.keys(next).length || !farmId || !cropId || areaNum == null) return;

    const body: CreateFarmerCropBody = { farmId, cropId, sowingDate, area: areaNum, areaUnit: unit };
    if (y != null) body.expectedYield = y;
    if (p != null) body.expectedPricePerQuintal = p;
    mutation.mutate(body, { onSuccess: onSaved });
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <Chips
        label={t('crops.pickFarm')}
        value={farmId}
        onChange={setFarmId}
        error={errors.farm}
        options={farms.map((f) => ({ value: f.id, label: f.name, icon: 'map' as const }))}
      />
      <Chips
        label={t('crops.pickCrop')}
        value={cropId}
        onChange={setCropId}
        error={errors.crop}
        options={sortedCrops.map((c) => ({ value: c.id, label: loc(c) }))}
      />
      {crop ? (
        <AppText variant="small" muted>
          {`${t(`enums.season.${crop.season}`)} · ${t('crops.duration', { n: crop.durationDays })}`}
        </AppText>
      ) : null}

      <DatePicker
        label={t('crops.sowingDate')}
        value={sowingDate}
        onChange={setSowingDate}
        minDate={shiftDay(todayString(), -365)}
        maxDate={shiftDay(todayString(), 180)}
      />

      {harvestDate && crop ? (
        <Card tone="primary">
          <View style={styles.row}>
            <Icon name="basket" size={28} color={colors.primaryDark} />
            <AppText variant="large" bold color={colors.primaryDark} style={{ flex: 1 }}>
              {t('crops.harvestDate', { date: formatDate(harvestDate, t) })}
            </AppText>
          </View>
          <AppText variant="small">
            {t('crops.harvestPreview', { date: formatDate(harvestDate, t), n: crop.durationDays })}
          </AppText>
        </Card>
      ) : null}

      <TextField
        label={t('crops.area')}
        value={area}
        onChangeText={setArea}
        keyboardType="decimal-pad"
        error={errors.area}
      />
      <Segmented
        value={unit}
        onChange={setUnit}
        options={AREA_UNITS.map((u) => ({ value: u, label: t(`enums.areaUnit.${u}`) }))}
      />

      <TextField
        label={t('crops.expectedYield')}
        optionalLabel={t('common.optional')}
        value={yieldText}
        onChangeText={setYieldText}
        keyboardType="decimal-pad"
        hint={usualYield != null ? t('crops.usualYield', { n: usualYield }) : t('crops.expectedYieldHint')}
        error={errors.yield}
      />
      <TextField
        label={t('crops.expectedPrice')}
        optionalLabel={t('common.optional')}
        value={priceText}
        onChangeText={setPriceText}
        keyboardType="decimal-pad"
        prefix="₹"
        hint={t('crops.expectedPriceHint')}
        error={errors.price}
      />

      <FormError message={mutation.isError ? errorMessage(mutation.error, t) : null} />
      <Button title={t('crops.add')} icon="checkmark" onPress={submit} loading={mutation.isPending} />
      {extra}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
