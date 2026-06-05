import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  LessonGroupDetail,
  ReciterOut,
  SurahBrief,
} from '../types/api';

const PREFIX = '@ustadapp/cache/v1/';
/** Static Quran catalogue — long TTL (surahs/ayahs rarely change). */
const STATIC_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type Entry<T> = { data: T; savedAt: number };

async function readEntry<T>(key: string, ttlMs: number): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry<T>;
    if (Date.now() - entry.savedAt > ttlMs) {
      await AsyncStorage.removeItem(PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

async function writeEntry<T>(key: string, data: T): Promise<void> {
  const entry: Entry<T> = { data, savedAt: Date.now() };
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
}

export async function getCachedSurahs(
  juz: number,
  mvpOnly: boolean,
): Promise<SurahBrief[] | null> {
  return readEntry<SurahBrief[]>(`surahs:${juz}:${mvpOnly}`, STATIC_TTL_MS);
}

export async function setCachedSurahs(
  juz: number,
  mvpOnly: boolean,
  data: SurahBrief[],
): Promise<void> {
  await writeEntry(`surahs:${juz}:${mvpOnly}`, data);
}

export async function getCachedLessonGroup(
  groupId: string,
): Promise<LessonGroupDetail | null> {
  return readEntry<LessonGroupDetail>(`group:${groupId}`, STATIC_TTL_MS);
}

export async function setCachedLessonGroup(
  groupId: string,
  data: LessonGroupDetail,
): Promise<void> {
  await writeEntry(`group:${groupId}`, data);
}

export async function getCachedReciters(): Promise<ReciterOut[] | null> {
  return readEntry<ReciterOut[]>('reciters', STATIC_TTL_MS);
}

export async function setCachedReciters(data: ReciterOut[]): Promise<void> {
  await writeEntry('reciters', data);
}
