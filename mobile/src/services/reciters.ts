import { contentApi } from '../api';
import type { ReciterOut } from '../types/api';
import { getCachedReciters, setCachedReciters } from './contentCache';

let memoryReciters: ReciterOut[] | null = null;

export async function loadReciters(): Promise<ReciterOut[]> {
  if (memoryReciters) {
    return memoryReciters;
  }
  const stored = await getCachedReciters();
  if (stored?.length) {
    memoryReciters = stored;
    void contentApi
      .reciters()
      .then(data => {
        memoryReciters = data;
        void setCachedReciters(data);
      })
      .catch(() => null);
    return stored;
  }
  const data = await contentApi.reciters();
  memoryReciters = data;
  await setCachedReciters(data);
  return data;
}

export function clearRecitersCache(): void {
  memoryReciters = null;
}
