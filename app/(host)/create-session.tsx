import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createSession, startSession } from '@/lib/api';

type StopDraft = {
  id: string;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  radius_m: string;
};

function newStop(): StopDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radius_m: '120',
  };
}

function stopsToPubs(stops: StopDraft[]) {
  return stops.map((s) => ({
    name: s.name.trim(),
    address: s.address.trim() || undefined,
    latitude: Number(s.latitude),
    longitude: Number(s.longitude),
    radius_m: s.radius_m.trim() ? Number(s.radius_m) : 120,
  }));
}

export default function CreateSessionScreen() {
  const [sessionName, setSessionName] = useState('');
  const [stops, setStops] = useState<StopDraft[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const addLocation = useCallback(() => {
    setStops((prev) => [...prev, newStop()]);
  }, []);

  const updateStop = useCallback((id: string, patch: Partial<StopDraft>) => {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const removeStop = useCallback((id: string) => {
    setStops((prev) => prev.filter((s) => s.id !== id));
  }, []);

  async function handleCreateSession() {
    try {
      const pubs = stopsToPubs(stops);
      if (!sessionName.trim()) {
        Alert.alert('Missing name', 'Enter a session name.');
        return;
      }
      if (pubs.length === 0) {
        Alert.alert('Add locations', 'Tap the + button to add at least one pub stop.');
        return;
      }
      for (let i = 0; i < pubs.length; i++) {
        const p = pubs[i];
        if (!p.name) {
          Alert.alert('Incomplete stop', `Stop ${i + 1}: enter a name.`);
          return;
        }
        if (Number.isNaN(p.latitude) || Number.isNaN(p.longitude)) {
          Alert.alert('Invalid coordinates', `Stop ${i + 1}: enter valid latitude and longitude.`);
          return;
        }
        if (p.radius_m !== undefined && (Number.isNaN(p.radius_m) || p.radius_m <= 0)) {
          Alert.alert('Invalid radius', `Stop ${i + 1}: radius must be a positive number (meters).`);
          return;
        }
      }

      setLoading(true);
      const result = await createSession({ name: sessionName.trim(), pubs });
      setSessionId(result.session.id);
      setJoinCode(result.joinCode);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      Alert.alert('Create failed', error instanceof Error ? error.message : 'Unexpected error');
    }
  }

  async function handleStartSession() {
    if (!sessionId) return;
    try {
      setLoading(true);
      await startSession(sessionId);
      setLoading(false);
      Alert.alert('Race started', 'Route is now locked for everyone.');
    } catch (error) {
      setLoading(false);
      Alert.alert('Unable to start', error instanceof Error ? error.message : 'Unexpected error');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Host Session</Text>
      <TextInput
        placeholder="Session name"
        style={styles.input}
        value={sessionName}
        onChangeText={setSessionName}
      />

      <View style={styles.locationsHeader}>
        <Text style={styles.sectionTitle}>Locations</Text>
        <Pressable
          accessibilityLabel="Add location"
          style={({ pressed }) => [styles.addIconButton, pressed && styles.addIconButtonPressed]}
          onPress={addLocation}>
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      </View>
      <Text style={styles.help}>Tap + to add a pub. Fill in each form in visit order.</Text>

      {stops.length === 0 ? (
        <Text style={styles.emptyHint}>No stops yet. Tap + to add your first pub.</Text>
      ) : (
        stops.map((stop, index) => (
          <View key={stop.id} style={styles.stopCard}>
            <View style={styles.stopCardHeader}>
              <Text style={styles.stopLabel}>Stop {index + 1}</Text>
              <Pressable
                accessibilityLabel={`Remove stop ${index + 1}`}
                hitSlop={8}
                onPress={() => removeStop(stop.id)}>
                <Ionicons name="trash-outline" size={22} color="#64748b" />
              </Pressable>
            </View>
            <TextInput
              placeholder="Pub name"
              style={styles.input}
              value={stop.name}
              onChangeText={(t) => updateStop(stop.id, { name: t })}
            />
            <TextInput
              placeholder="Address (optional)"
              style={styles.input}
              value={stop.address}
              onChangeText={(t) => updateStop(stop.id, { address: t })}
            />
            <View style={styles.row}>
              <TextInput
                placeholder="Latitude"
                keyboardType="numbers-and-punctuation"
                style={[styles.input, styles.half]}
                value={stop.latitude}
                onChangeText={(t) => updateStop(stop.id, { latitude: t })}
              />
              <TextInput
                placeholder="Longitude"
                keyboardType="numbers-and-punctuation"
                style={[styles.input, styles.half]}
                value={stop.longitude}
                onChangeText={(t) => updateStop(stop.id, { longitude: t })}
              />
            </View>
            <TextInput
              placeholder="Radius (meters)"
              keyboardType="number-pad"
              style={styles.input}
              value={stop.radius_m}
              onChangeText={(t) => updateStop(stop.id, { radius_m: t })}
            />
          </View>
        ))
      )}

      <Pressable style={styles.button} onPress={handleCreateSession} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Create session'}</Text>
      </Pressable>

      {joinCode ? <Text style={styles.joinCode}>Join code: {joinCode}</Text> : null}

      <Pressable
        style={[styles.button, !sessionId && styles.buttonDisabled]}
        disabled={!sessionId || loading}
        onPress={handleStartSession}>
        <Text style={styles.buttonText}>Start race (locks route)</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  locationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  addIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconButtonPressed: { opacity: 0.85 },
  help: { color: '#475569', fontSize: 14 },
  emptyHint: { color: '#94a3b8', fontStyle: 'italic', paddingVertical: 8 },
  stopCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    backgroundColor: '#f8fafc',
  },
  stopCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stopLabel: { fontSize: 15, fontWeight: '700', color: '#334155' },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  button: { backgroundColor: '#0f172a', borderRadius: 10, alignItems: 'center', padding: 12 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600' },
  joinCode: { fontSize: 20, fontWeight: '700', color: '#1d4ed8' },
});
