/** Canonical ayah id for API requests, e.g. `114_001`. */
export function formatAyahId(surahNumber: number, ayahNumber: number): string {
  return `${surahNumber}_${String(ayahNumber).padStart(3, '0')}`;
}

export function ayahIdForApi(ayah: {
  surah_number: number;
  ayah_number: number;
}): string {
  return formatAyahId(ayah.surah_number, ayah.ayah_number);
}
