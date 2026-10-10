import React, { useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, useWindowDimensions, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

// Shared layout for every exercise: content sits as low as it can while still
// ending above the feedback sheet, so it lands around the middle of the
// screen instead of hugging the header. The action button is pinned at the
// bottom.
//
// The space reserved for the sheet never makes a screen scroll: it only uses
// room that is actually free, so on a short phone the content just sits a
// little lower instead. Only content that is genuinely taller than the screen
// scrolls, exactly as it did before this layout existed.
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

  const wanted = FEEDBACK_SHEET_HEIGHT + SHEET_GAP - spaceBelowViewport;
  const free = viewportHeight > 0 ? viewportHeight - contentHeight - CONTENT_PADDING : wanted;
  const paddingBottom = Math.max(CONTENT_PADDING, Math.min(wanted, free));

  return (
    <View style={S.root}>
      <View ref={viewportRef} collapsable={false} style={S.viewport} onLayout={onViewportLayout}>
        <ScrollView
          contentContainerStyle={[S.content, { paddingBottom }]}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={false}
        >
          <View style={contentStyle} onLayout={e => setContentHeight(e.nativeEvent.layout.height)}>
            {children}
          </View>
        </ScrollView>
      </View>
      {footer ? <View style={S.footer}>{footer}</View> : null}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  viewport: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: CONTENT_PADDING, paddingTop: CONTENT_PADDING },
  footer: { paddingHorizontal: CONTENT_PADDING, paddingTop: 8, paddingBottom: CONTENT_PADDING },
});
