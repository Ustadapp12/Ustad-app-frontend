import { useScriptStore } from '../store/scriptStore';
import type { ScriptPreference } from '../types/api';

export type ArabicFontKey = 'naskh' | 'amiri';

/** Map script preference → actual RN fontFamily string */
export function scriptToFontFamily(script: ScriptPreference | null | undefined): string {
  // 'nastaliq' is the "Indo-Pak" onboarding/profile option — it now points at
  // the real Nastaliq typeface (previously AmiriQuran, a Naskh-style font
  // mislabeled as Nastaliq). 'nastaliq_urdu' is kept as a synonym for old
  // persisted preferences from before the two keys were unified.
  if (script === 'nastaliq' || script === 'nastaliq_urdu') return 'NotoNastaliqUrdu';
  if (script === 'amiri') return 'AmiriRegular';
  return 'NotoNaskhArabic_400Regular'; // uthmani + simple + default
}

// NotoNastaliqUrdu's letterforms cascade diagonally and stack diacritics
// vertically — at the same nominal fontSize it reads narrower than
// NotoNaskhArabic but needs dramatically more vertical room per line (the
// typeface's own design guidance calls for roughly double a typical Naskh/
// Latin line-height). Treating that as a single "shrink by X%" factor
// applied equally to fontSize and lineHeight cannot fix both problems at
// once: shrink enough to stop vertical clipping and the text goes tiny;
// shrink only a little and it still clips/overlaps neighboring UI ("TOO BIG",
// text covering other elements) despite being nominally "scaled". So this is
// two independent knobs — tune each against real on-device screenshots, not
// just once against a single test string.
const NASTALIQ_FONT_SCALE = 0.72; // shrinks glyph width/size
const NASTALIQ_LINE_HEIGHT_SCALE = 1.55; // grows vertical room relative to Naskh's own ratio

/** Multiply base fontSize by this factor for fonts whose glyphs render larger/smaller. */
export function scriptFontScale(script: ScriptPreference | null | undefined): number {
  if (script === 'nastaliq' || script === 'nastaliq_urdu') return NASTALIQ_FONT_SCALE;
  return 1;
}

/** Extra multiplier (on top of scriptFontScale) applied only to lineHeight. */
export function scriptLineHeightScale(script: ScriptPreference | null | undefined): number {
  if (script === 'nastaliq' || script === 'nastaliq_urdu') return NASTALIQ_LINE_HEIGHT_SCALE;
  return 1;
}

/** Hook: returns { fontFamily, scale, lineHeightScale } derived from the global script store. */
export function useArabicFont(): { fontFamily: string; scale: number; lineHeightScale: number } {
  const script = useScriptStore(s => s.script);
  return {
    fontFamily: scriptToFontFamily(script),
    scale: scriptFontScale(script),
    lineHeightScale: scriptLineHeightScale(script),
  };
}

/** Convenience: inline style object for an Arabic Text element. */
export function arabicTextStyle(
  base: { fontSize: number; lineHeight?: number; [key: string]: unknown },
  font: { fontFamily: string; scale: number; lineHeightScale?: number },
): Record<string, unknown> {
  const fontSize = Math.round(base.fontSize * font.scale);
  const lineHeight = base.lineHeight
    ? Math.round(base.lineHeight * font.scale * (font.lineHeightScale ?? 1))
    : undefined;
  return {
    ...base,
    fontFamily: font.fontFamily,
    fontSize,
    ...(lineHeight !== undefined ? { lineHeight } : {}),
  };
}
