import { Tabs } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { Pressable, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '@/api/hooks';
import { Icon, type IconName } from '@/components';
import { colors, fontSize, touch } from '@/theme';

function tabIcon(name: IconName, focusedName: IconName) {
  return ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <Icon name={focused ? focusedName : name} size={28} color={color} />
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const unread = useNotifications().data?.unreadCount ?? 0;

  const bell = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('notifications.title')}
      onPress={() => router.push('/notifications')}
      style={{ minWidth: touch.min, minHeight: touch.min, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}
    >
      <Icon name={unread ? 'notifications' : 'notifications-outline'} size={26} color={colors.onPrimary} />
    </Pressable>
  );

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.onPrimary,
        headerTitleStyle: { fontSize: fontSize.title, fontWeight: '700' },
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 14, fontWeight: '700' },
        tabBarStyle: {
          height: 68 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerRight: bell,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('common.appName'), tabBarLabel: t('tabs.home'), tabBarIcon: tabIcon('home-outline', 'home') }}
      />
      <Tabs.Screen
        name="crops"
        options={{ title: t('crops.title'), tabBarLabel: t('tabs.crops'), tabBarIcon: tabIcon('leaf-outline', 'leaf') }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t('tasks.title'),
          tabBarLabel: t('tabs.tasks'),
          tabBarIcon: tabIcon('calendar-outline', 'calendar'),
        }}
      />
      <Tabs.Screen
        name="mandi"
        options={{
          title: t('mandi.title'),
          tabBarLabel: t('tabs.mandi'),
          tabBarIcon: tabIcon('storefront-outline', 'storefront'),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('more.title'),
          tabBarLabel: t('tabs.more'),
          tabBarIcon: tabIcon('menu-outline', 'menu'),
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
        }}
      />
    </Tabs>
  );
}
