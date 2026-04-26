import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerBackTitle: 'Back' }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ title: 'Sign In' }} />
        <Stack.Screen name="(host)/create-session" options={{ title: 'Create Session' }} />
        <Stack.Screen name="(player)/join-session" options={{ title: 'Join Session' }} />
        <Stack.Screen name="(race)/leaderboard" options={{ title: 'Leaderboard' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
