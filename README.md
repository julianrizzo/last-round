# Pub Race (v1)

Mobile app for running in-person Pub Race sessions with:
- Host-created routes and join codes
- One drink + photo proof per stop
- GPS radius validation and stop-order validation
- Live leaderboard powered by Supabase Realtime

## Local setup

1. Install dependencies:
   - `npm install`
2. Copy env file and fill credentials:
   - `cp .env.example .env`
3. Run mobile app:
   - `npm run ios` or `npm run android`

## Supabase setup

1. Run SQL migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
2. Create a storage bucket named `checkin-photos`.
3. Deploy edge functions:
   - `create_session`
   - `join_session`
   - `start_session`
   - `submit_checkin`

## Routes

- `app/(auth)/login.tsx`
- `app/(host)/create-session.tsx`
- `app/(player)/join-session.tsx`
- `app/(race)/leaderboard.tsx`

## Testing

- Run lint: `npm run lint`
- Run validation tests: `npm test`

## Multiplayer verification checklist

- Host signs in, creates session with 3+ stops, and receives join code.
- Host appears in leaderboard as a racer before race start.
- One player joins using join code and appears in leaderboard.
- Host starts session and cannot edit route afterward (RLS + draft-only stop writes).
- Both users submit check-ins in order with photo + GPS.
- Out-of-order and outside-radius submissions are rejected/marked invalid.
- Leaderboard updates on both devices within a few seconds.
