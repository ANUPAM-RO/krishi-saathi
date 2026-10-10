import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/auth/AuthContext';
import { colors } from '@/theme';

export default function AuthLayout() {
  const { languageChosen } = useAuth();
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        initialRouteName={languageChosen ? 'login' : 'language'}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Screen name="language" />
        <Stack.Screen name="login" />
        <Stack.Screen name="otp" />
      </Stack>
    </>
  );
}
