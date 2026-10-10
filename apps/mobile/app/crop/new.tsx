import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components';
import { CropForm } from '@/features/CropForm';

export default function NewCropScreen() {
  const { farmId } = useLocalSearchParams<{ farmId?: string }>();
  return (
    <Screen keyboard>
      <CropForm
        initialFarmId={farmId}
        onSaved={(fc) => router.replace({ pathname: '/crop/[id]', params: { id: fc.id } })}
      />
    </Screen>
  );
}
