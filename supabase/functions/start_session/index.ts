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
    const sessionId = String(body.sessionId ?? '').trim();
    if (!sessionId) return new Response('Missing session id', { status: 400 });

    const { data: session, error: sessionError } = await serviceRole
      .from('sessions')
      .select('id,host_user_id,status')
      .eq('id', sessionId)
      .single();
    if (sessionError || !session) return new Response('Session not found', { status: 404 });
    if (session.host_user_id !== user.id) return new Response('Only host can start session', { status: 403 });
    if (session.status !== 'draft') return new Response('Session is already started', { status: 400 });

    const startedAt = new Date().toISOString();
    const { error: updateError } = await serviceRole
      .from('sessions')
      .update({ status: 'live', started_at: startedAt })
      .eq('id', sessionId)
      .eq('status', 'draft');
    if (updateError) return new Response(updateError.message, { status: 400 });

    return Response.json({ startedAt });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Unexpected error', { status: 500 });
  }
});
