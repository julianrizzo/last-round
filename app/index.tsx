import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pub Race</Text>
      <Text style={styles.subtitle}>Host a session, race your mates, and track live times.</Text>

      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed && styles.pressed]}
          onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.buttonTextPrimary}>Sign in</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed && styles.pressed]}
          onPress={() => router.push('/(host)/create-session')}>
          <Text style={styles.buttonTextPrimary}>Host a game</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed && styles.pressed]}
          onPress={() => router.push('/(player)/join-session')}>
          <Text style={styles.buttonTextPrimary}>Join a game</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.button, styles.buttonSecondary, pressed && styles.pressedSecondary]}
          onPress={() => router.push('/(race)/leaderboard')}>
          <Text style={styles.buttonTextSecondary}>Open leaderboard</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
  },
  subtitle: {
    color: '#475569',
    fontSize: 16,
    marginBottom: 8,
  },
  buttons: {
    gap: 12,
    marginTop: 8,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#0f172a',
  },
  buttonSecondary: {
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  pressed: {
    opacity: 0.88,
  },
  pressedSecondary: {
    opacity: 0.92,
    backgroundColor: '#cbd5e1',
  },
  buttonTextPrimary: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '600',
  },
});
