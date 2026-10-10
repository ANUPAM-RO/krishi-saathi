import { useLocalSearchParams } from 'expo-router';
import { Linking, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useScheme } from '@/api/hooks';
import { AppText, Button, Card, QueryBoundary, Screen, SectionHeader } from '@/components';
import type { IconName } from '@/components/Icon';
import { colors, spacing } from '@/theme';

const openUrl = (url: string) => void Linking.openURL(url).catch(() => undefined);

const SECTIONS: { key: 'benefits' | 'eligibility' | 'howToApply' | 'documents'; icon: IconName }[] = [
  { key: 'benefits', icon: 'gift' },
  { key: 'eligibility', icon: 'people' },
  { key: 'howToApply', icon: 'list' },
  { key: 'documents', icon: 'folder-open' },
];

export default function SchemeDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useScheme(id);

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <QueryBoundary query={query}>
        {(s) => (
          <>
            <Card tone="primary">
              <AppText variant="small" bold color={colors.primaryDark}>
                {[t(`enums.schemeCategory.${s.category}`), s.state ?? t('schemes.central')].join(' · ')}
              </AppText>
              <AppText variant="heading">{s.title}</AppText>
              <AppText variant="large">{s.summary}</AppText>
            </Card>

            {SECTIONS.filter((sec) => s[sec.key]).map((sec) => (
              <View key={sec.key} style={{ gap: spacing.sm }}>
                <SectionHeader title={t(`schemes.${sec.key}`)} icon={sec.icon} />
                <Card>
                  <AppText variant="large">{s[sec.key]}</AppText>
                </Card>
              </View>
            ))}

            {s.applyUrl ? (
              <Button title={t('schemes.openWebsite')} icon="open" onPress={() => openUrl(s.applyUrl!)} />
            ) : null}
            {s.helpline ? (
              <Button
                title={t('schemes.callHelpline', { number: s.helpline })}
                icon="call"
                variant="outline"
                onPress={() => openUrl(`tel:${s.helpline!.replace(/[^\d+]/g, '')}`)}
              />
            ) : null}

            <AppText variant="small" muted center>
              {t('schemes.disclaimer')}
            </AppText>
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}
