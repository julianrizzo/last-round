import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Missing auth header', { status: 401 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const serviceRole = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return new Response('Unauthorized', { status: 401 });

    const body = await req.json();
    const joinCode = String(body.joinCode ?? '').trim().toUpperCase();
    if (!joinCode) return new Response('Missing join code', { status: 400 });

    const { data: session, error: sessionError } = await serviceRole
      .from('sessions')
      .select('id,status')
      .eq('join_code', joinCode)
      .single();
    if (sessionError || !session) return new Response('Session not found', { status: 404 });
    if (session.status === 'finished') return new Response('Session already finished', { status: 400 });

    const { error: joinError } = await serviceRole.from('session_players').upsert({
      session_id: session.id,
      user_id: user.id,
      role: 'player',
    });
    if (joinError) return new Response(joinError.message, { status: 400 });

    const { count: totalStops } = await serviceRole
      .from('pub_stops')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session.id);

    await serviceRole.from('player_progress').upsert({
      session_id: session.id,
      player_id: user.id,
      total_stops: totalStops ?? 0,
      completed_stops: 0,
    });

    return Response.json({ sessionId: session.id });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Unexpected error', { status: 500 });
  }
});
