import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '@/api/endpoints';
import { useDeleteExpense } from '@/api/hooks';
import { qk } from '@/api/queryKeys';
import type { Expense, ExpenseList } from '@/api/types';
import { Button, FormError, QueryBoundary, Screen } from '@/components';
import { ExpenseForm } from '@/features/ExpenseForm';
import { errorMessage } from '@/lib/errors';
import { spacing } from '@/theme';

/** There is no GET /expenses/:id, so look in cached lists first, then fetch the full list. */
function useExpense(id: string | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: [...qk.expensesAll, 'item', id ?? ''],
    enabled: !!id,
    queryFn: async (): Promise<Expense | null> => {
      const cached = qc
        .getQueriesData<ExpenseList>({ queryKey: qk.expensesAll })
        .flatMap(([, d]) => (d && Array.isArray(d.items) ? d.items : []));
      const hit = cached.find((e) => e.id === id);
      if (hit) return hit;
      const all = await api.expenses.list();
      return all.items.find((e) => e.id === id) ?? null;
    },
  });
}

export default function EditExpenseScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useExpense(id);
  const del = useDeleteExpense();

  const confirmDelete = () =>
    Alert.alert(t('expenses.deleteTitle'), t('expenses.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => del.mutate(id, { onSuccess: () => router.back() }) },
    ]);

  return (
    <Screen keyboard>
      <QueryBoundary
        query={query}
        isEmpty={(e) => e === null}
        empty={{ icon: 'help-circle-outline', title: t('errors.notFound') }}
      >
        {(expense) =>
          expense ? (
            <>
              <ExpenseForm expense={expense} onSaved={() => router.back()} />
              <FormError message={del.isError ? errorMessage(del.error, t) : null} />
              <Button
                title={t('common.delete')}
                variant="danger"
                size="medium"
                icon="trash"
                loading={del.isPending}
                onPress={confirmDelete}
                style={{ marginTop: spacing.xl }}
              />
            </>
          ) : null
        }
      </QueryBoundary>
    </Screen>
  );
}
