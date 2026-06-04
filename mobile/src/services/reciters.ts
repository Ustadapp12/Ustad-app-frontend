import { contentApi } from '../api';
import type { ReciterOut } from '../types/api';

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
