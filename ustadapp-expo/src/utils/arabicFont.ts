import { useScriptStore } from '../store/scriptStore';
import type { ScriptPreference } from '../types/api';

export type ArabicFontKey = 'naskh' | 'amiri';

/** Map script preference → actual RN fontFamily string */
export function scriptToFontFamily(script: ScriptPreference | null | undefined): string {
  if (script === 'nastaliq') return 'AmiriQuran';
  if (script === 'amiri') return 'AmiriRegular';
  if (script === 'nastaliq_urdu') return 'NotoNastaliqUrdu';
  return 'NotoNaskhArabic_400Regular'; // uthmani + simple + default
}

/** Multiply base fontSize by this factor for fonts whose glyphs render larger/smaller. */
export function scriptFontScale(script: ScriptPreference | null | undefined): number {
  if (script === 'nastaliq') return 1.08;
  if (script === 'nastaliq_urdu') return 1.15;
  return 1;
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
