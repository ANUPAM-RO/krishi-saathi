import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSchemes } from '@/api/hooks';
import { AppText, Card, Icon, QueryBoundary, Screen } from '@/components';
import { useLanguage } from '@/i18n/localized';
import { SCHEME_ICONS } from '@/lib/enumUi';
import { colors, radius, spacing } from '@/theme';

export default function SchemesScreen() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const query = useSchemes(lang);

  return (
    <Screen onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <QueryBoundary
        query={query}
        isEmpty={(list) => list.length === 0}
        empty={{ icon: 'document-text-outline', message: t('schemes.none') }}
      >
        {(list) => (
          <>
            {list.map((s) => (
              <Card key={s.id} onPress={() => router.push({ pathname: '/schemes/[id]', params: { id: s.id } })}>
                <View style={styles.header}>
                  <View style={styles.icon}>
                    <Icon name={SCHEME_ICONS[s.category]} size={24} color={colors.primaryDark} />
                  </View>
                  <AppText variant="small" bold color={colors.primaryDark} style={{ flex: 1 }}>
                    {[t(`enums.schemeCategory.${s.category}`), s.state ?? t('schemes.central')].join(' · ')}
                  </AppText>
                  <Icon name="chevron-forward" size={22} color={colors.textMuted} />
                </View>
                <AppText variant="title">{s.title}</AppText>
                <AppText>{s.summary}</AppText>
              </Card>
            ))}
            <AppText variant="small" muted center>
              {t('schemes.disclaimer')}
            </AppText>
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
