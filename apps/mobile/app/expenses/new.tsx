import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components';
import { ExpenseForm } from '@/features/ExpenseForm';

export default function NewExpenseScreen() {
  const { farmerCropId } = useLocalSearchParams<{ farmerCropId?: string }>();
  return (
    <Screen keyboard>
      <ExpenseForm initialFarmerCropId={farmerCropId} onSaved={() => router.back()} />
    </Screen>
  );
}
