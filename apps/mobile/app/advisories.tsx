import { useTranslation } from 'react-i18next';
import { useAdvisories } from '@/api/hooks';
import { AppText, Card, QueryBoundary, Screen } from '@/components';
import { useLanguage } from '@/i18n/localized';
import { formatDate } from '@/lib/format';
import { colors } from '@/theme';

export default function AdvisoriesScreen() {
  const { t } = useTranslation();
  const { lang, loc } = useLanguage();
  const query = useAdvisories(lang);

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <QueryBoundary
        query={query}
        isEmpty={(list) => list.length === 0}
        empty={{ icon: 'bulb-outline', message: t('advisories.none') }}
      >
        {(list) =>
          list.map((a) => (
            <Card key={a.id}>
              <AppText variant="small" bold color={colors.primaryDark}>
                {[a.crop ? loc(a.crop) : t('advisories.general'), a.season ? t(`enums.season.${a.season}`) : null]
                  .filter(Boolean)
                  .join(' · ')}
              </AppText>
              <AppText variant="title">{a.title}</AppText>
              <AppText variant="large">{a.description}</AppText>
              <AppText variant="small" muted>
                {[formatDate(a.publishedAt ?? a.createdAt, t), a.district].filter(Boolean).join(' · ')}
              </AppText>
            </Card>
          ))
        }
      </QueryBoundary>
    </Screen>
  );
}
