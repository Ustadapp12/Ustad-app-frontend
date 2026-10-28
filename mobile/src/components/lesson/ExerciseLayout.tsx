import React, { useContext, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, useWindowDimensions, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ExerciseWave, { ExerciseWaveContext } from './ExerciseWave';

// Height of the tallest answer-feedback sheet (FeedbackBanner's "Incorrect"
// variant with the correct answer shown), measured from the screen bottom.
// Exercise content is kept above this line so the sheet never covers it.
const FEEDBACK_SHEET_HEIGHT = 280;
const SHEET_GAP = 12;
// Matches LessonHeader's horizontal padding so every edge lines up with the header.
const CONTENT_PADDING = 14;
// First-frame guess of the footer + bottom inset, replaced by a real
// measurement once laid out; close enough that the content barely moves.
const ESTIMATED_FOOTER_HEIGHT = 74;

interface Props {
  children: React.ReactNode;
  /** Pinned below the scroll area (Check button, mic area); omit for none. */
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

// Shared layout for every exercise: content is centred vertically in the
// space between the header and the footer (Check button / mic area). The
// action button is pinned at the bottom.
//
// Centring alone would let the feedback sheet cover the bottom of tall
// content, so when the centred position would end below the sheet's top
// edge the content moves up just enough to clear it. It never moves above
// the top padding and never makes a screen scroll: only content genuinely
// taller than the screen scrolls.
//
// This used to anchor content to the bottom (justifyContent: 'flex-end') and
// hand all leftover space to the top, so where an exercise sat depended on
// its own height: short ones (recitation) dropped onto the mic with a large
// empty gap above, tall ones (audio_fill) rose under the header.
export default function ExerciseLayout({ children, footer, contentStyle }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const viewportRef = useRef<View>(null);
  const [spaceBelowViewport, setSpaceBelowViewport] = useState(ESTIMATED_FOOTER_HEIGHT + insets.bottom);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const onViewportLayout = (e: LayoutChangeEvent) => {
    setViewportHeight(e.nativeEvent.layout.height);
    viewportRef.current?.measureInWindow((_x, y, _w, h) => {
      setSpaceBelowViewport(Math.max(0, windowHeight - (y + h)));
    });
  };

  const measured = viewportHeight > 0 && contentHeight > 0;
  // How far above the viewport's bottom edge content must end to clear the sheet.
  const sheetClearance = FEEDBACK_SHEET_HEIGHT + SHEET_GAP - spaceBelowViewport;
  // Room left over once the content and the base padding on both sides fit.
  const free = measured ? viewportHeight - contentHeight - CONTENT_PADDING * 2 : 0;
  const centredOffset = free / 2;
  const offsetClearingSheet = free - (sheetClearance - CONTENT_PADDING);
  const extraTop = Math.max(0, Math.min(centredOffset, offsetClearingSheet));
  // The empty gap between the content's bottom and the footer: where the
  // playing wave goes. Zero or less when the content fills or scrolls.
  const showWave = useContext(ExerciseWaveContext);
  const contentBottom = CONTENT_PADDING + extraTop + contentHeight;

  return (
    <View style={S.root}>
      <View ref={viewportRef} collapsable={false} style={S.viewport} onLayout={onViewportLayout}>
        <ScrollView
          // Hidden for the one frame before both heights are known, so the
          // content doesn't flash at the top and then jump to the middle.
          style={!measured && S.hidden}
          contentContainerStyle={[S.content, { paddingTop: CONTENT_PADDING + extraTop }]}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={false}
        >
          <View style={contentStyle} onLayout={e => setContentHeight(e.nativeEvent.layout.height)}>
            {children}
          </View>
        </ScrollView>
        {showWave && measured && <ExerciseWave gapTop={contentBottom} gapHeight={viewportHeight - contentBottom} />}
      </View>
      {footer ? <View style={S.footer}>{footer}</View> : null}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  viewport: { flex: 1 },
  content: { paddingHorizontal: CONTENT_PADDING, paddingBottom: CONTENT_PADDING },
  hidden: { opacity: 0 },
  footer: { paddingHorizontal: CONTENT_PADDING, paddingTop: 8, paddingBottom: CONTENT_PADDING },
});
