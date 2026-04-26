export type SessionStatus = 'draft' | 'live' | 'finished';

export type RaceSession = {
  id: string;
  host_user_id: string;
  name: string;
  join_code: string;
  status: SessionStatus;
  started_at: string | null;
  ended_at: string | null;
};

export type LeaderboardRow = {
  session_id: string;
  player_id: string;
  display_name: string | null;
  total_elapsed_seconds: number | null;
  completed_stops: number;
  total_stops: number;
  rank_position: number;
  last_valid_checkin_at: string | null;
};
