import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { fetchLeaderboard, submitCheckin } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { LeaderboardRow } from '@/lib/types';

async function uploadPhoto(sessionId: string, uri: string) {
  const file = await fetch(uri).then((res) => res.blob());
  const path = `${sessionId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('checkin-photos').upload(path, file, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export default function LeaderboardScreen() {
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const [sessionIdInput, setSessionIdInput] = useState(params.sessionId ?? '');
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [stopId, setStopId] = useState('');

  const activeSessionId = useMemo(() => params.sessionId ?? sessionIdInput.trim(), [params.sessionId, sessionIdInput]);

  async function loadLeaderboard() {
    if (!activeSessionId) return;
    try {
      setLoading(true);
      setRows(await fetchLeaderboard(activeSessionId));
      setLoading(false);
    } catch (error) {
      setLoading(false);
      Alert.alert('Leaderboard error', error instanceof Error ? error.message : 'Unexpected error');
    }
  }

  useEffect(() => {
    if (!activeSessionId) return;
    loadLeaderboard();
    const channel = supabase
      .channel(`leaderboard-${activeSessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_progress', filter: `session_id=eq.${activeSessionId}` },
        () => {
          loadLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  async function handleSubmitCheckin() {
    if (!activeSessionId || !stopId.trim()) {
      Alert.alert('Missing details', 'Provide session and stop id.');
      return;
    }
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        Alert.alert('Permission required', 'Camera access is needed for photo proof.');
        return;
      }
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (!locationPermission.granted) {
        Alert.alert('Permission required', 'Location access is needed for check-ins.');
        return;
      }

      const image = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (image.canceled) return;

      const currentLocation = await Location.getCurrentPositionAsync({});
      const photoPath = await uploadPhoto(activeSessionId, image.assets[0].uri);

      await submitCheckin({
        sessionId: activeSessionId,
        stopId: stopId.trim(),
        lat: currentLocation.coords.latitude,
        lng: currentLocation.coords.longitude,
        photoPath,
      });
      Alert.alert('Check-in sent', 'Your stop submission is being scored.');
      await loadLeaderboard();
    } catch (error) {
      Alert.alert('Check-in failed', error instanceof Error ? error.message : 'Unexpected error');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Leaderboard</Text>
      <TextInput
        placeholder="Session id"
        style={styles.input}
        value={sessionIdInput}
        onChangeText={setSessionIdInput}
      />
      <TextInput placeholder="Next stop id" style={styles.input} value={stopId} onChangeText={setStopId} />
      <Pressable style={styles.button} onPress={handleSubmitCheckin}>
        <Text style={styles.buttonText}>Submit stop photo</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.secondary]} onPress={loadLeaderboard} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Refreshing...' : 'Refresh rankings'}</Text>
      </Pressable>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.player_id}
        ListEmptyComponent={<Text style={styles.empty}>No rankings yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>#{item.rank_position}</Text>
            <View style={styles.player}>
              <Text style={styles.name}>{item.display_name ?? 'Player'}</Text>
              <Text style={styles.meta}>
                {item.completed_stops}/{item.total_stops} stops
              </Text>
            </View>
            <Text style={styles.time}>
              {item.total_elapsed_seconds === null ? '--' : `${Math.round(item.total_elapsed_seconds)}s`}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  button: { backgroundColor: '#0f172a', borderRadius: 10, alignItems: 'center', padding: 12 },
  secondary: { backgroundColor: '#334155' },
  buttonText: { color: '#fff', fontWeight: '600' },
  empty: { color: '#64748b', marginTop: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 10,
  },
  rank: { fontSize: 20, width: 42, fontWeight: '700' },
  player: { flex: 1 },
  name: { fontWeight: '600', fontSize: 16 },
  meta: { color: '#64748b' },
  time: { fontVariant: ['tabular-nums'], fontWeight: '700' },
});
