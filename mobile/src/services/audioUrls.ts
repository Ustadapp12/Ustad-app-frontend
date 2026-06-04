import { API_BASE } from '../config';
import { loadReciters } from './reciters';
import type { AyahOut, WordOut } from '../types/api';

let publicAudioBaseUrl: string | null = null;

/** Prefer API `audio_url`; optional fallback from rel_path + cached base. */
export function resolveAudioUrl(
  audioUrl: string | null | undefined,
  relPath: string | null | undefined,
  base: string | null | undefined,
): string | null {
  if (audioUrl) {
    return audioUrl;
  }
  if (!relPath || !base) {
    return null;
  }
  const root = base.replace(/\/$/, '');
  const path = relPath.replace(/^\//, '');
  return `${root}/${path}`;
}

export async function loadPublicAudioBaseFromHealth(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) {
      return;
    }
    const data = (await res.json()) as { public_audio_base_url?: string };
    if (typeof data.public_audio_base_url === 'string') {
      publicAudioBaseUrl = data.public_audio_base_url;
    }
  } catch {
    // optional — reciter base is the other fallback
  }
}

/** Cache reciters + health audio base for rel_path fallbacks. */
export async function warmAudioUrlCache(): Promise<void> {
  await Promise.all([loadReciters(), loadPublicAudioBaseFromHealth()]);
}

async function audioFallbackBase(reciterId?: string): Promise<string | null> {
  if (!publicAudioBaseUrl) {
    await loadPublicAudioBaseFromHealth();
  }
  if (publicAudioBaseUrl) {
    return publicAudioBaseUrl;
  }
  const reciters = await loadReciters();
  const id = reciterId ?? 'husary';
  const reciter = reciters.find(r => r.id === id) ?? reciters[0];
  return reciter?.audio_base_url ?? null;
}

/** Full ayah: explicit URL → ayah.audio_url → audio_assets fallback. */
export async function resolveAyahPlayUrl(
  ayah: AyahOut,
  explicitUrl?: string | null,
  reciterId?: string,
): Promise<string | null> {
  if (explicitUrl) {
    return explicitUrl;
  }
  if (ayah.audio_url) {
    return ayah.audio_url;
  }

  const id = reciterId ?? ayah.default_reciter_id ?? 'husary';
  const asset = ayah.audio_assets?.[id];
  if (!asset) {
    return null;
  }
  const base = await audioFallbackBase(id);
  return resolveAudioUrl(asset.audio_url, asset.rel_path, base);
}

/** Word: word.audio_url, else rel_path + cached base. */
export async function resolveWordPlayUrl(
  word: WordOut,
  reciterId?: string,
): Promise<string | null> {
  const base = await audioFallbackBase(reciterId);
  return resolveAudioUrl(word.audio_url, word.audio_rel_path, base);
}
