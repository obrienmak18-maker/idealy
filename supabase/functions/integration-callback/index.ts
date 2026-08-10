import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * integration-callback — Reçoit le code OAuth de GitHub/Figma,
 * échange contre un access_token, le stocke dans la table `integrations`.
 *
 * URL : https://<project>.supabase.co/functions/v1/integration-callback?code=...&state=...&provider=github
 * Configurez cette URL comme Redirect URI dans votre GitHub OAuth App.
 */

const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const provider = url.searchParams.get('provider') ?? 'github';

    if (!code || !state) {
      return Response.redirect(`${APP_URL}?error=missing_code_or_state`);
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate CSRF state
    const { data: oauthState, error: stateError } = await supabase
      .from('oauth_states')
      .select('user_id, provider')
      .eq('state', state)
      .single();

    if (stateError || !oauthState) {
      return Response.redirect(`${APP_URL}?error=invalid_state`);
    }

    // Clean up used state
    await supabase.from('oauth_states').delete().eq('state', state);

    // Provider-specific token exchange
    const providerConfigs: Record<string, { tokenUrl: string; clientIdEnv: string; clientSecretEnv: string }> = {
      github: {
        tokenUrl: 'https://github.com/login/oauth/access_token',
        clientIdEnv: 'GITHUB_CLIENT_ID',
        clientSecretEnv: 'GITHUB_CLIENT_SECRET',
      },
      figma: {
        tokenUrl: 'https://www.figma.com/api/oauth/token',
        clientIdEnv: 'FIGMA_CLIENT_ID',
        clientSecretEnv: 'FIGMA_CLIENT_SECRET',
      },
    };

    const config = providerConfigs[provider];
    if (!config) {
      return Response.redirect(`${APP_URL}?error=unsupported_provider`);
    }

    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/integration-callback?provider=${provider}`;

    // Exchange code for access token
    const tokenRes = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: Deno.env.get(config.clientIdEnv),
        client_secret: Deno.env.get(config.clientSecretEnv),
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error('Token exchange failed:', tokenData);
      return Response.redirect(`${APP_URL}?error=token_exchange_failed`);
    }

    // Store token in integrations table (upsert)
    const { error: upsertError } = await supabase
      .from('integrations')
      .upsert({
        user_id: oauthState.user_id,
        provider,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token ?? null,
        metadata: {
          scope: tokenData.scope,
          token_type: tokenData.token_type,
          connected_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' });

    if (upsertError) {
      console.error('Failed to store integration:', upsertError);
      return Response.redirect(`${APP_URL}?error=storage_failed`);
    }

    // Redirect back to the app with success
    return Response.redirect(`${APP_URL}?connected=${provider}`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    return Response.redirect(`${APP_URL}?error=internal`);
  }
});
