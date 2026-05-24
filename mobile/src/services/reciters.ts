import { contentApi } from '../api';
import type { AyahOut, ReciterOut } from '../types/api';

let cachedReciters: ReciterOut[] | null = null;

export async function loadReciters(): Promise<ReciterOut[]> {
  if (cachedReciters) {
    return cachedReciters;
  }
  cachedReciters = await contentApi.reciters();
  return cachedReciters;
}

export function clearRecitersCache(): void {
  cachedReciters = null;
}

/** Build playable URL: prefer API audio_url, else reciter base + rel_path. */
export async function resolveAyahAudioUrl(
  ayah: AyahOut,
  reciterId?: string,
): Promise<string | null> {
  const id = reciterId ?? ayah.default_reciter_id ?? 'husary';
  const asset = ayah.audio_assets?.[id];
  if (!asset) {
    return null;
  }
  if (asset.audio_url) {
    return asset.audio_url;
  }
  if (!asset.rel_path) {
    return null;
  }
  const reciters = await loadReciters();
  const reciter = reciters.find(r => r.id === id);
  if (!reciter?.audio_base_url) {
    return null;
  }
  const base = reciter.audio_base_url.endsWith('/')
    ? reciter.audio_base_url
    : `${reciter.audio_base_url}/`;
  const path = asset.rel_path.startsWith('/')
    ? asset.rel_path.slice(1)
    : asset.rel_path;
  return `${base}${path}`;
}
