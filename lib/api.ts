import { supabase } from '@/lib/supabase';
import type { LeaderboardRow, RaceSession } from '@/lib/types';

export async function createSession(params: {
  name: string;
  pubs: Array<{ name: string; address?: string; latitude: number; longitude: number; radius_m?: number }>;
}) {
  const { data, error } = await supabase.functions.invoke('create_session', { body: params });
  if (error) throw error;
  return data as { session: RaceSession; joinCode: string };
}

export async function joinSession(joinCode: string) {
  const { data, error } = await supabase.functions.invoke('join_session', {
    body: { joinCode: joinCode.trim().toUpperCase() },
  });
  if (error) throw error;
  return data as { sessionId: string };
}

export async function startSession(sessionId: string) {
  const { data, error } = await supabase.functions.invoke('start_session', { body: { sessionId } });
  if (error) throw error;
  return data as { startedAt: string };
}

export async function submitCheckin(payload: {
  sessionId: string;
  stopId: string;
  lat: number;
  lng: number;
  photoPath: string;
}) {
  const { data, error } = await supabase.functions.invoke('submit_checkin', { body: payload });
  if (error) throw error;
  return data as { isValid: boolean; reason: string | null };
}

export async function fetchLeaderboard(sessionId: string) {
  const { data, error } = await supabase
    .from('leaderboard_view')
    .select('*')
    .eq('session_id', sessionId)
    .order('rank_position', { ascending: true });
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}
