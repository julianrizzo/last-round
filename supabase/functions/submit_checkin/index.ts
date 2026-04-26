import { createClient } from 'npm:@supabase/supabase-js@2';

import { calculateDistanceMeters } from '../_shared/validation.ts';

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
    const sessionId = String(body.sessionId ?? '');
    const stopId = String(body.stopId ?? '');
    const photoPath = String(body.photoPath ?? '');
    const lat = Number(body.lat);
    const lng = Number(body.lng);

    if (!sessionId || !stopId || !photoPath || Number.isNaN(lat) || Number.isNaN(lng)) {
      return new Response('Missing required fields', { status: 400 });
    }

    const { data: session } = await serviceRole
      .from('sessions')
      .select('id,status,started_at')
      .eq('id', sessionId)
      .single();
    if (!session || session.status !== 'live' || !session.started_at) {
      return new Response('Session is not live', { status: 400 });
    }

    const { data: membership } = await serviceRole
      .from('session_players')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!membership) return new Response('Player is not in this session', { status: 403 });

    const { data: stop } = await serviceRole
      .from('pub_stops')
      .select('id,session_id,stop_index,latitude,longitude,radius_m')
      .eq('id', stopId)
      .eq('session_id', sessionId)
      .single();
    if (!stop) return new Response('Stop not found', { status: 404 });

    const { data: previousValidStops } = await serviceRole
      .from('checkins')
      .select('stop_id,pub_stops!inner(stop_index)')
      .eq('session_id', sessionId)
      .eq('player_id', user.id)
      .eq('is_valid', true);

    const highestCompletedIndex = (previousValidStops ?? []).reduce((acc, item: any) => {
      return Math.max(acc, Number(item.pub_stops.stop_index));
    }, 0);

    if (stop.stop_index !== highestCompletedIndex + 1) {
      return new Response('Stops must be completed in order', { status: 400 });
    }

    const distanceM = calculateDistanceMeters(lat, lng, stop.latitude, stop.longitude);
    const isValid = distanceM <= stop.radius_m;
    const invalidReason = isValid ? null : 'outside_radius';

    const { error: insertError } = await serviceRole.from('checkins').insert({
      session_id: sessionId,
      player_id: user.id,
      stop_id: stopId,
      photo_path: photoPath,
      lat,
      lng,
      distance_m: distanceM,
      is_valid: isValid,
      invalid_reason: invalidReason,
    });
    if (insertError) return new Response(insertError.message, { status: 400 });

    return Response.json({ isValid, reason: invalidReason });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Unexpected error', { status: 500 });
  }
});
