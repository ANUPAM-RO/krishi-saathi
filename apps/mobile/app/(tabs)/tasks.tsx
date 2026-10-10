import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useActivities } from '@/api/hooks';
import type { ActivityRange } from '@/api/types';
import { QueryBoundary, Screen, Segmented } from '@/components';
import { TaskItem } from '@/features/Cards';

const RANGES: ActivityRange[] = ['today', 'upcoming', 'overdue', 'completed'];

function isRange(v: unknown): v is ActivityRange {
  return typeof v === 'string' && (RANGES as string[]).includes(v);
}

export default function TasksScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ segment?: string }>();
  const [range, setRange] = useState<ActivityRange>(isRange(params.segment) ? params.segment : 'today');

  // Deep links such as "see late tasks" switch the segment.
  useEffect(() => {
    if (isRange(params.segment)) setRange(params.segment);
  }, [params.segment]);

  const query = useActivities(range);

  const emptyText: Record<ActivityRange, string> = {
    today: t('tasks.emptyToday'),
    upcoming: t('tasks.emptyUpcoming'),
    overdue: t('tasks.emptyOverdue'),
    completed: t('tasks.emptyCompleted'),
  };

  return (
    <Screen edges={[]} onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <Segmented
        value={range}
        onChange={setRange}
        options={[
          { value: 'today', label: t('tasks.today'), icon: 'today' },
          { value: 'upcoming', label: t('tasks.upcoming'), icon: 'calendar' },
          { value: 'overdue', label: t('tasks.overdue'), icon: 'alert-circle' },
          { value: 'completed', label: t('tasks.completed'), icon: 'checkmark-done' },
        ]}
      />
      <QueryBoundary
        query={query}
        isEmpty={(list) => list.length === 0}
        empty={{ icon: range === 'overdue' ? 'happy-outline' : 'calendar-clear-outline', message: emptyText[range] }}
      >
        {(list) => {
          const sorted = [...list].sort((a, b) =>
            range === 'completed'
              ? (b.completedAt ?? b.scheduledDate).localeCompare(a.completedAt ?? a.scheduledDate)
              : a.scheduledDate.localeCompare(b.scheduledDate),
          );
          return sorted.map((a) => <TaskItem key={a.id} activity={a} />);
        }}
      </QueryBoundary>
    </Screen>
  );
}
