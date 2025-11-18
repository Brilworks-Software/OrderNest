import { Stack } from 'expo-router';
export default function auth() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name='login' />
        <Stack.Screen name='signUp' />
        <Stack.Screen name='forgotPassword' />
        <Stack.Screen name='onboarding' />
    </Stack>
  );
}
