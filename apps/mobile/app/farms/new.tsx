import { router } from 'expo-router';
import { Screen } from '@/components';
import { FarmForm } from '@/features/FarmForm';

export default function NewFarmScreen() {
  return (
    <Screen keyboard>
      <FarmForm onSaved={(farm) => router.replace({ pathname: '/farms/[id]', params: { id: farm.id } })} />
    </Screen>
  );
}
