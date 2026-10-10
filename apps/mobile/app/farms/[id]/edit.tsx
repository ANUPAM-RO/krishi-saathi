import { router, useLocalSearchParams } from 'expo-router';
import { useFarm } from '@/api/hooks';
import { QueryBoundary, Screen } from '@/components';
import { FarmForm } from '@/features/FarmForm';

export default function EditFarmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useFarm(id);
  return (
    <Screen keyboard>
      <QueryBoundary query={query}>{(farm) => <FarmForm farm={farm} onSaved={() => router.back()} />}</QueryBoundary>
    </Screen>
  );
}
