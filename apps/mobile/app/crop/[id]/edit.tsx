import { FARMER_CROP_STATUSES, type FarmerCropStatus } from '@krishi/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDeleteFarmerCrop, useFarmerCrop, useUpdateFarmerCrop } from '@/api/hooks';
import type { FarmerCropDetail } from '@/api/types';
import { AppText, Button, Chips, FormError, QueryBoundary, Screen, TextField } from '@/components';
import { useLanguage } from '@/i18n/localized';
import { errorMessage } from '@/lib/errors';
import { parseDecimal } from '@/lib/format';
import { spacing } from '@/theme';

export default function EditCropScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useFarmerCrop(id);
  return (
    <Screen keyboard>
      <QueryBoundary query={query}>{(fc) => <EditCropForm fc={fc} />}</QueryBoundary>
    </Screen>
  );
}

function EditCropForm({ fc }: { fc: FarmerCropDetail }) {
  const { t } = useTranslation();
  const { loc } = useLanguage();
  const update = useUpdateFarmerCrop();
  const del = useDeleteFarmerCrop();
  const [status, setStatus] = useState<FarmerCropStatus>(fc.status);
  const [yieldText, setYieldText] = useState(fc.expectedYield != null ? String(fc.expectedYield) : '');
  const [priceText, setPriceText] = useState(
    fc.expectedPricePerQuintal != null ? String(fc.expectedPricePerQuintal) : '',
  );
  const [notes, setNotes] = useState(fc.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = () => {
    const next: Record<string, string> = {};
    const y = parseDecimal(yieldText);
    const p = parseDecimal(priceText);
    if (y != null && (Number.isNaN(y) || y < 0)) next.yield = t('errors.invalidNumber');
    if (p != null && (Number.isNaN(p) || p < 0)) next.price = t('errors.invalidNumber');
    setErrors(next);
    if (Object.keys(next).length) return;
    update.mutate(
      {
        id: fc.id,
        body: {
          status,
          // Empty clears the farmer's value so the server falls back to crop default / mandi price.
          expectedYield: y,
          expectedPricePerQuintal: p,
          notes: notes.trim() || null,
        },
      },
      { onSuccess: () => router.back() },
    );
  };

  const confirmDelete = () =>
    Alert.alert(t('crops.deleteTitle'), t('crops.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => del.mutate(fc.id, { onSuccess: () => router.replace('/crops') }),
      },
    ]);

  return (
    <View style={{ gap: spacing.lg }}>
      <AppText variant="heading">{`${loc(fc.crop)} · ${fc.farm.name}`}</AppText>
      <Chips
        label={t('crops.status')}
        value={status}
        onChange={setStatus}
        options={FARMER_CROP_STATUSES.map((s) => ({ value: s, label: t(`enums.cropStatus.${s}`) }))}
      />
      <TextField
        label={t('crops.expectedYield')}
        optionalLabel={t('common.optional')}
        value={yieldText}
        onChangeText={setYieldText}
        keyboardType="decimal-pad"
        hint={t('crops.expectedYieldHint')}
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
      <TextField
        label={t('crops.notes')}
        optionalLabel={t('common.optional')}
        value={notes}
        onChangeText={setNotes}
        multiline
      />
      <FormError message={update.isError ? errorMessage(update.error, t) : null} />
      <Button title={t('common.save')} icon="checkmark" onPress={save} loading={update.isPending} />
      <FormError message={del.isError ? errorMessage(del.error, t) : null} />
      <Button
        title={t('crops.deleteCrop')}
        variant="danger"
        size="medium"
        icon="trash"
        loading={del.isPending}
        onPress={confirmDelete}
        style={{ marginTop: spacing.xl }}
      />
    </View>
  );
}
