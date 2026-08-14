import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user identity using the auth header (anon client for auth.getUser)
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user } } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { provider } = await req.json();

    // OAuth URLs for different providers
    const oauthConfigs: Record<string, { authUrl: string; scopes: string }> = {
      github: {
        authUrl: 'https://github.com/login/oauth/authorize',
        scopes: 'repo user',
      },
      figma: {
        authUrl: 'https://www.figma.com/oauth',
        scopes: 'files:read',
      },
    };

    const config = oauthConfigs[provider];
    if (!config || !['github', 'figma'].includes(provider)) {
      return new Response(JSON.stringify({ error: 'Invalid provider' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const clientId = Deno.env.get(`${provider.toUpperCase()}_CLIENT_ID`);
    if (!clientId) {
      return new Response(JSON.stringify({ error: 'OAuth provider is not configured on the server' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID();

    // Store state in database
    await supabase.from('oauth_states').insert({
      user_id: user.id,
      provider,
      state,
      created_at: new Date().toISOString(),
    });

    // Build authorization URL
    // redirect_uri must match exactly what's configured in the OAuth app settings
    // Point to our integration-callback Edge Function which handles token exchange
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/integration-callback?provider=${provider}`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: config.scopes,
      state,
      response_type: 'code',
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;

    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});