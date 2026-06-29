import { useScriptStore } from '../store/scriptStore';
import type { ScriptPreference } from '../types/api';

export type ArabicFontKey = 'naskh' | 'amiri';

/** Map script preference → actual RN fontFamily string */
export function scriptToFontFamily(script: ScriptPreference | null | undefined): string {
  if (script === 'nastaliq') return 'AmiriQuran';
  return 'NotoNaskhArabic_400Regular'; // uthmani + simple both use Naskh
}

/**
 * Amiri Quran glyphs are naturally larger than Noto Naskh at the same px.
 * Multiply base fontSize by this factor when using AmiriQuran.
 */
export function scriptFontScale(script: ScriptPreference | null | undefined): number {
  return script === 'nastaliq' ? 1.08 : 1;
}

/** Hook: returns { fontFamily, scale } derived from the global script store. */
export function useArabicFont(): { fontFamily: string; scale: number } {
  const script = useScriptStore(s => s.script);
  return {
    fontFamily: scriptToFontFamily(script),
    scale: scriptFontScale(script),
  };
}

/** Convenience: inline style object for an Arabic Text element. */
export function arabicTextStyle(
  base: { fontSize: number; lineHeight?: number; [key: string]: unknown },
  font: { fontFamily: string; scale: number },
): Record<string, unknown> {
  const fontSize = Math.round(base.fontSize * font.scale);
  const lineHeight = base.lineHeight ? Math.round(base.lineHeight * font.scale) : undefined;
  return {
    ...base,
    fontFamily: font.fontFamily,
    fontSize,
    ...(lineHeight !== undefined ? { lineHeight } : {}),
  };
}
