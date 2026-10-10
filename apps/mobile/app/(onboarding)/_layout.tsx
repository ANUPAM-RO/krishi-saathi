import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';

export default function OnboardingLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        initialRouteName="onboarding/profile"
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Screen name="onboarding/profile" />
        <Stack.Screen name="onboarding/farm" />
        <Stack.Screen name="onboarding/crop" />
      </Stack>
    </>
  );
}
