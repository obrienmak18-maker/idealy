import { getSupabaseClient } from '@/supabaseClient';
import { getWebContainerInstance } from '@/core/webcontainer/webcontainer';

export interface DesignerPhoto {
  id: number;
  url: string;
  photographer: string;
  photographerUrl: string;
  imageUrl: string;
  alt: string;
  source: 'pexels';
}

export type DesignerImageDecision =
  | { kind: 'photos'; query: string; photos: DesignerPhoto[]; attribution: string; attributionUrl: string }
  | { kind: 'generated'; path: string; mimeType: string; provider: string };

async function designerRequest<T>(body: Record<string, unknown>): Promise<T> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase non configuré.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Connectez-vous avant d’utiliser les outils du Designer.');
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  if (!supabaseUrl || !anonKey) throw new Error('Configuration publique Supabase incomplète.');

  const response = await fetch(`${supabaseUrl}/functions/v1/designer-tools`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload && typeof payload.error === 'string' ? payload.error : `Designer tools error (${response.status}).`);
  return payload as T;
}

export async function searchImages(query: string, count = 4): Promise<{ photos: DesignerPhoto[]; attribution: string; attributionUrl: string }> {
  return designerRequest({ action: 'searchImages', query, count });
}

function bytesFromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function generateImage(prompt: string): Promise<{ path: string; mimeType: string; provider: string }> {
  const payload = await designerRequest<{ base64: string; mimeType: string; provider: string; suggestedPath: string }>({ action: 'generateImage', prompt });
  const instance = await getWebContainerInstance();
  await instance.fs.mkdir('assets', { recursive: true });
  const extension = payload.mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  const path = `assets/generated-${crypto.randomUUID()}.${extension}`;
  await instance.fs.writeFile(path, bytesFromBase64(payload.base64));
  return { path, mimeType: payload.mimeType, provider: payload.provider };
}

const GENERATED_VISUAL_HINTS = /logo|illustration|illustration|icône|icon|mascotte|pattern|motif|art direction|visuel sur mesure|génère une image|generate an image/i;

/** Choisit une source réelle pour les besoins photo, et une génération pour les visuels conçus sur mesure. */
export async function resolveDesignerImage(prompt: string, count = 4): Promise<DesignerImageDecision> {
  if (GENERATED_VISUAL_HINTS.test(prompt)) {
    const generated = await generateImage(prompt);
    return { kind: 'generated', ...generated };
  }
  const photos = await searchImages(prompt, count);
  return { kind: 'photos', query: prompt, ...photos };
}
