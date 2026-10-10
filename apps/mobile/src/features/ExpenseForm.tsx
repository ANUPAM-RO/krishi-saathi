import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@krishi/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFarmerCrops, useSaveExpense } from '@/api/hooks';
import type { Expense } from '@/api/types';
import { AppText, Button, Card, Chips, DatePicker, FormError, Icon, QueryBoundary, TextField } from '@/components';
import { useLanguage } from '@/i18n/localized';
import { EXPENSE_ICONS } from '@/lib/enumUi';
import { errorMessage } from '@/lib/errors';
import { dateOnly, parseDecimal, shiftDay, todayString } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

export interface ExpenseFormProps {
  expense?: Expense;
  initialFarmerCropId?: string;
  onSaved: () => void;
}

export function ExpenseForm(props: ExpenseFormProps) {
  const { t } = useTranslation();
  const cropsQuery = useFarmerCrops();
  if (props.expense) return <ExpenseFormInner {...props} />;
  return (
    <QueryBoundary
      query={cropsQuery}
      isEmpty={(list) => list.length === 0}
      empty={{
        icon: 'leaf-outline',
        message: t('expenses.needCrop'),
        actionLabel: t('crops.add'),
        onAction: () => router.push('/crop/new'),
      }}
    >
      {() => <ExpenseFormInner {...props} />}
    </QueryBoundary>
  );
}

function ExpenseFormInner({ expense, initialFarmerCropId, onSaved }: ExpenseFormProps) {
  const { t } = useTranslation();
  const { loc } = useLanguage();
  const farmerCrops = useFarmerCrops().data ?? [];
  const mutation = useSaveExpense();

  const [farmerCropId, setFarmerCropId] = useState<string | null>(
    expense?.farmerCropId ?? initialFarmerCropId ?? (farmerCrops.length === 1 ? farmerCrops[0].id : null),
  );
  const [category, setCategory] = useState<ExpenseCategory | null>(expense?.category ?? null);
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [date, setDate] = useState(expense ? dateOnly(expense.expenseDate) : todayString());
  const [description, setDescription] = useState(expense?.description ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Active crops first, then finished ones.
  const cropOptions = [...farmerCrops]
    .sort((a, b) => Number(b.status === 'ACTIVE') - Number(a.status === 'ACTIVE'))
    .map((fc) => ({ value: fc.id, label: `${loc(fc.crop)} · ${fc.farm.name}` }));

  const submit = () => {
    const next: Record<string, string> = {};
    if (!farmerCropId) next.crop = t('errors.selectCrop');
    if (!category) next.category = t('errors.selectCategory');
    const value = parseDecimal(amount);
    if (value == null) next.amount = t('errors.required');
    else if (Number.isNaN(value)) next.amount = t('errors.invalidNumber');
    else if (value <= 0) next.amount = t('errors.positiveNumber');
    setErrors(next);
    if (Object.keys(next).length || !farmerCropId || !category || value == null) return;
    mutation.mutate(
      {
        id: expense?.id,
        body: {
          farmerCropId,
          category,
          amount: value,
          expenseDate: date,
          description: description.trim() || undefined,
        },
      },
      { onSuccess: onSaved },
    );
  };

  return (
    <View style={{ gap: spacing.lg }}>
      {expense ? (
        <Card tone="primary">
          <AppText variant="small" muted>
            {t('expenses.crop')}
          </AppText>
          <AppText variant="large" bold>{`${loc(expense.farmerCrop.crop)} · ${expense.farmerCrop.farm.name}`}</AppText>
        </Card>
      ) : (
        <Chips
          label={t('expenses.crop')}
          value={farmerCropId}
          onChange={setFarmerCropId}
          options={cropOptions}
          error={errors.crop}
        />
      )}

      <View style={{ gap: spacing.sm }}>
        <AppText variant="label">{t('expenses.category')}</AppText>
        <View style={styles.grid} accessibilityRole="radiogroup">
          {EXPENSE_CATEGORIES.map((c) => {
            const selected = c === category;
            return (
              <Pressable
                key={c}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={t(`enums.expenseCategory.${c}`)}
                onPress={() => setCategory(c)}
                style={({ pressed }) => [styles.tile, selected && styles.tileSelected, pressed && { opacity: 0.85 }]}
              >
                <Icon name={EXPENSE_ICONS[c]} size={32} color={selected ? colors.onPrimary : colors.accent} />
                <AppText variant="small" bold center numberOfLines={2} color={selected ? colors.onPrimary : colors.text}>
                  {t(`enums.expenseCategory.${c}`)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {errors.category ? (
          <AppText variant="small" color={colors.danger}>
            {errors.category}
          </AppText>
        ) : null}
      </View>

      <TextField
        label={t('expenses.amount')}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        prefix="₹"
        placeholder="0"
        large
        error={errors.amount}
      />
      <DatePicker
        label={t('expenses.date')}
        value={date}
        onChange={setDate}
        maxDate={todayString()}
        minDate={shiftDay(todayString(), -730)}
      />
      <TextField
        label={t('expenses.description')}
        optionalLabel={t('common.optional')}
        placeholder={t('expenses.descriptionPlaceholder')}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <FormError message={mutation.isError ? errorMessage(mutation.error, t) : null} />
      <Button title={t('common.save')} icon="checkmark" onPress={submit} loading={mutation.isPending} />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '23%',
    flexGrow: 1,
    minWidth: 76,
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tileSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
});
