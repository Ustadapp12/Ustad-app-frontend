import React from 'react';
import { View, Text, Image, TouchableOpacity, Animated } from 'react-native';
import { START_SRC, NEXT_STAGE_SRC, PREVIOUS_STAGE_SRC, NEXT_STAGE_ASPECT, PREVIOUS_STAGE_ASPECT, END_LUMO_SRC, CHAPTER_COUNT } from '../mapModel';
import type { Styles } from '../mapStyles';

// Everything at the bottom of a chapter: the final chapter's "whole Quran"
// banner, the Previous/Next stage signs, and the end-of-map Lumo. Memoized:
// its scroll interpolations are rebuilt only when the chapter or layout
// changes, not on every MapScreen render.
interface Props {
  S: Styles['S'];
  sc: (n: number) => number;
  mapH: number;
  viewportH: number;
  comingSoonY: number | null;
  chapterIdx: number;
  scrollY: Animated.Value;
  onGoToChapter: (next: number, land: 'top' | 'bottom') => void;
}

function MapChapterEnd({ S, sc, mapH: MAP_H, viewportH: height, comingSoonY, chapterIdx, scrollY, onGoToChapter: goToChapter }: Props) {
  return (
    <>
    {/* Reserved space at the end of the final chapter — see comingSoonY
        in buildMapModel. Centered on the y it computed, same grass/road
        tiles behind it as everywhere else, just no nodes past here. */}
    {comingSoonY != null && (
      <View style={[S.comingSoonBanner, { top: comingSoonY - sc(20) }]}>
        <Text style={S.comingSoonText}>The whole Quran!</Text>
      </View>
    )}

    {/* End of the chapter — both paging signs side by side, parallel to
        where the path itself ends, instead of previous-at-top/
        next-at-bottom. Row is centered and gap-based (not fixed
        left/right offsets) so it re-centers on any screen width. Sits
        inside FOOTER_PAD, clear of the last node's ayah pill. */}
    <View style={{ position: 'absolute', left: 0, right: 0, top: MAP_H - sc(365), alignItems: 'center' }}>
      <Image source={START_SRC} style={{ width: sc(100), height: sc(80) }} resizeMode="contain" />
      {(chapterIdx > 0 || chapterIdx < CHAPTER_COUNT - 1) ? (
        <View style={S.chapterSignRow}>
          {chapterIdx > 0 && (
            <TouchableOpacity
              style={S.chapterSignCol}
              activeOpacity={0.85}
              onPress={() => goToChapter(chapterIdx - 1, 'bottom')}
            >
              <Image
                source={PREVIOUS_STAGE_SRC}
                style={{ width: sc(108), height: sc(108) / PREVIOUS_STAGE_ASPECT }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
          {chapterIdx < CHAPTER_COUNT - 1 && (
            <TouchableOpacity
              style={S.chapterSignCol}
              activeOpacity={0.85}
              onPress={() => goToChapter(chapterIdx + 1, 'top')}
            >
              <Image
                source={NEXT_STAGE_SRC}
                style={{ width: sc(108), height: sc(108) / NEXT_STAGE_ASPECT }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Text style={S.endText}>More coming soon…</Text>
      )}
    </View>

    {/* End of the map. Now that bottom overscroll is off, reaching the
        last pixel used to be a dead stop against blank grass, so Lumo
        pops down into the space FOOTER_PAD reserves for him and says
        as much.
        Driven straight off scrollY rather than a focus/viewport flag:
        the interpolation runs on the native driver, so this costs zero
        re-renders of a screen that is already the heaviest in the app.
        An on-mount animation would have been wrong anyway — it would
        play while the user is still at the top of the map, and they
        would arrive to find him already sitting there. Math.max guards
        a map shorter than the viewport, where MAP_H - height goes
        negative and the input range would otherwise invert. */}
    {(() => {
      const endY = Math.max(sc(1), MAP_H - height);
      const popFrom = Math.max(0, endY - sc(190));
      const pop = scrollY.interpolate({
        inputRange: [popFrom, endY],
        outputRange: [-sc(34), 0],
        extrapolate: 'clamp',
      });
      const fade = scrollY.interpolate({
        inputRange: [popFrom, endY - sc(40)],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });
      return (
        <Animated.View
          pointerEvents="none"
          style={[S.endLumoWrap, { top: MAP_H - sc(113), opacity: fade, transform: [{ translateY: pop }] }]}
        >
          <View style={S.endLumoBubble}>
            <Text style={S.endLumoText}>nothing to see here</Text>
          </View>
          <Image source={END_LUMO_SRC} style={S.endLumoImg} resizeMode="contain" />
        </Animated.View>
      );
    })()}
    </>
  );
}

export default React.memo(MapChapterEnd);
