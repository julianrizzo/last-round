import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { joinSession } from '@/lib/api';

export default function JoinSessionScreen() {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!joinCode.trim()) {
      return;
    }
    try {
      setLoading(true);
      const result = await joinSession(joinCode);
      setLoading(false);
      router.push({ pathname: '/(race)/leaderboard', params: { sessionId: result.sessionId } });
    } catch (error) {
      setLoading(false);
      Alert.alert('Join failed', error instanceof Error ? error.message : 'Unexpected error');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Session</Text>
      <TextInput
        autoCapitalize="characters"
        placeholder="Join code"
        style={styles.input}
        value={joinCode}
        onChangeText={setJoinCode}
      />
      <Pressable style={styles.button} onPress={handleJoin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Joining...' : 'Join game'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 18 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  button: { backgroundColor: '#0f172a', borderRadius: 10, alignItems: 'center', padding: 12 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
