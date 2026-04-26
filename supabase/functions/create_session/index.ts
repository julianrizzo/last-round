import { createClient } from 'npm:@supabase/supabase-js@2';

import { generateJoinCode } from '../_shared/validation.ts';

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
    const name = String(body.name ?? '').trim();
    const pubs = Array.isArray(body.pubs) ? body.pubs : [];
    if (!name || pubs.length === 0) {
      return new Response('Session name and pubs are required', { status: 400 });
    }

    const joinCode = generateJoinCode();
    const { data: session, error: sessionError } = await serviceRole
      .from('sessions')
      .insert({
        host_user_id: user.id,
        name,
        join_code: joinCode,
      })
      .select('*')
      .single();
    if (sessionError) return new Response(sessionError.message, { status: 400 });

    const stopRows = pubs.map((pub: any, idx: number) => ({
      session_id: session.id,
      stop_index: idx + 1,
      name: String(pub.name),
      address: pub.address ? String(pub.address) : null,
      latitude: Number(pub.latitude),
      longitude: Number(pub.longitude),
      radius_m: pub.radius_m ? Number(pub.radius_m) : 120,
    }));

    const { error: stopsError } = await serviceRole.from('pub_stops').insert(stopRows);
    if (stopsError) return new Response(stopsError.message, { status: 400 });

    const { error: hostJoinError } = await serviceRole.from('session_players').insert({
      session_id: session.id,
      user_id: user.id,
      role: 'host',
    });
    if (hostJoinError) return new Response(hostJoinError.message, { status: 400 });

    await serviceRole.from('player_progress').upsert({
      session_id: session.id,
      player_id: user.id,
      total_stops: pubs.length,
      completed_stops: 0,
    });

    return Response.json({ session, joinCode });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Unexpected error', { status: 500 });
  }
});
