import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://idealy.app',
  'https://idealy-ai.netlify.app',
];
const MAX_QUERY_CHARS = 160;
const MAX_PROMPT_CHARS = 2_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

type DesignerRequest =
  | { action: 'searchImages'; query: string; count?: number }
  | { action: 'generateImage'; prompt: string };

type DesignerPhoto = {
  id: number;
  url: string;
  photographer: string;
  photographerUrl: string;
  imageUrl: string;
  alt: string;
  source: 'pexels';
};

function corsHeaders(req: Request): Record<string, string> {
  const configured = (Deno.env.get('IDEALY_ALLOWED_ORIGINS') ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
  const allowed = configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS;
  const requestOrigin = req.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': requestOrigin && allowed.includes(requestOrigin) ? requestOrigin : allowed[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(data: Record<string, unknown>, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

async function downloadImage(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image provider returned ${response.status}.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error('Generated image is too large.');
  return { base64: toBase64(bytes), mimeType: response.headers.get('content-type')?.split(';')[0] || 'image/png' };
}

async function searchPexels(query: string, count: number): Promise<DesignerPhoto[]> {
  const key = Deno.env.get('PEXELS_API_KEY') ?? '';
  if (!key) throw new Error('PEXELS_API_KEY is not configured on the server.');
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(count));
  url.searchParams.set('locale', 'fr-FR');
  const response = await fetch(url, { headers: { Authorization: key } });
  if (!response.ok) throw new Error(`Pexels returned ${response.status}.`);
  const payload = await response.json() as { photos?: Array<{ id: number; url: string; photographer: string; photographer_url: string; alt?: string; src?: { large?: string; medium?: string } }> };
  return (payload.photos ?? []).map((photo) => ({
    id: photo.id,
    url: photo.url,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    imageUrl: photo.src?.large ?? photo.src?.medium ?? '',
    alt: photo.alt || query,
    source: 'pexels' as const,
  })).filter((photo) => photo.imageUrl);
}

async function generateImage(prompt: string): Promise<{ base64: string; mimeType: string; provider: string }> {
  const apiKey = Deno.env.get('OPENAI_API_KEY') ?? Deno.env.get('IMAGE_GENERATION_API_KEY') ?? '';
  const endpoint = Deno.env.get('IMAGE_GENERATION_API_URL') ?? 'https://api.openai.com/v1/images/generations';
  const model = Deno.env.get('OPENAI_IMAGE_MODEL') ?? 'gpt-image-1';
  if (!apiKey) throw new Error('Image generation is not configured on the server.');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, size: '1024x1024' }),
  });
  const payload = await response.json().catch(() => null) as { data?: Array<{ b64_json?: string; url?: string }> } | null;
  if (!response.ok) throw new Error(`Image generation provider returned ${response.status}.`);
  const result = payload?.data?.[0];
  if (!result) throw new Error('Image generation provider returned no image.');
  if (result.b64_json) return { base64: result.b64_json, mimeType: 'image/png', provider: model };
  if (result.url) return { ...(await downloadImage(result.url)), provider: model };
  throw new Error('Image generation provider returned an unsupported response.');
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, headers);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !anonKey) return json({ error: 'Server configuration is incomplete.' }, 500, headers);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized.' }, 401, headers);
    const client = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: userError } = await client.auth.getUser(authHeader.slice('Bearer '.length));
    if (userError || !user) return json({ error: 'Unauthorized.' }, 401, headers);

    const body = await req.json().catch(() => null) as Partial<DesignerRequest> | null;
    if (!body || typeof body !== 'object') return json({ error: 'Invalid JSON request.' }, 400, headers);
    if (body.action === 'searchImages') {
      const query = typeof body.query === 'string' ? body.query.trim() : '';
      const count = typeof body.count === 'number' && Number.isInteger(body.count) ? Math.min(12, Math.max(1, body.count)) : 4;
      if (!query || query.length > MAX_QUERY_CHARS) return json({ error: 'query must be between 1 and 160 characters.' }, 400, headers);
      const photos = await searchPexels(query, count);
      return json({ photos, attribution: 'Photos provided by Pexels', attributionUrl: 'https://www.pexels.com' }, 200, headers);
    }
    if (body.action === 'generateImage') {
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      if (!prompt || prompt.length > MAX_PROMPT_CHARS) return json({ error: 'prompt must be between 1 and 2000 characters.' }, 400, headers);
      const image = await generateImage(prompt);
      return json({ ...image, suggestedPath: 'assets/generated-design.png' }, 200, headers);
    }
    return json({ error: 'Unsupported designer action.' }, 400, headers);
  } catch (error) {
    console.error('[designer-tools] request failed', error);
    return json({ error: error instanceof Error ? error.message : 'Designer tool failed.' }, 502, headers);
  }
});
