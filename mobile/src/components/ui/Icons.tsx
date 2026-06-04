import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// ── Google (brand colors) ──────────────────────────────────────────
export function GoogleIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.14 5.14 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Svg>
  );
}

// ── Apple (single-path silhouette — avoids garbled fills on Android) ─
export function AppleIcon({ size = 22, color = '#000' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 384 512">
      <Path
        fill={color}
        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-85.2-43.1-32.3-1.2-52.8 9.9-61.5 11.6-7.9 1.7-12.9 1.7-20.7 0-32.3-18.3-54.6-49.2-55.5-30.9-.9-59.7 18.3-68.5 47.8-28.8 89.1-22.9 137.5 20.3 27.8 22 45.2 52.6 45.6 87.5-.5 38.2-21.4 68.3-57.2 72.1-7.7.9-15 1.2-22.4 1.1z"
      />
    </Svg>
  );
}

// ── Bottom tab icons ───────────────────────────────────────────────
export function TabHomeIcon({ size = 24, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TabStatsIcon({ size = 24, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 19V11M12 19V5M19 19V9" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function TabProfileIcon({ size = 24, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Speaker icon ─────────────────────────────────────────────────
export function SpeakerIcon({ size = 16, color = '#05966A', muted = false }: {
  size?: number;
  color?: string;
  muted?: boolean;
}) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        position: 'absolute',
        left: 0,
        top: s * 0.25,
        width: s * 0.35,
        height: s * 0.5,
        backgroundColor: color,
        borderTopLeftRadius: 2,
        borderBottomLeftRadius: 2,
      }} />
      <View style={{
        position: 'absolute',
        left: s * 0.28,
        top: 0,
        width: 0,
        height: 0,
        borderTopWidth: s * 0.5,
        borderBottomWidth: s * 0.5,
        borderLeftWidth: s * 0.4,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: color,
      }} />
      {!muted && (
        <View style={{
          position: 'absolute',
          right: s * 0.08,
          top: s * 0.2,
          width: s * 0.18,
          height: s * 0.6,
          borderTopRightRadius: s * 0.15,
          borderBottomRightRadius: s * 0.15,
          borderWidth: Math.max(1.5, s * 0.1),
          borderLeftWidth: 0,
          borderColor: color,
        }} />
      )}
      {muted && (
        <>
          <View style={{
            position: 'absolute',
            right: s * 0.05,
            top: s * 0.25,
            width: Math.max(1.5, s * 0.1),
            height: s * 0.5,
            backgroundColor: color,
            transform: [{ rotate: '45deg' }],
            borderRadius: 1,
          }} />
          <View style={{
            position: 'absolute',
            right: s * 0.05,
            top: s * 0.25,
            width: Math.max(1.5, s * 0.1),
            height: s * 0.5,
            backgroundColor: color,
            transform: [{ rotate: '-45deg' }],
            borderRadius: 1,
          }} />
        </>
      )}
    </View>
  );
}

// ── Eye icon (password toggle) ────────────────────────────────────
export function EyeIcon({ open = true, size = 20, color = '#95A3B8' }: {
  open?: boolean;
  size?: number;
  color?: string;
}) {
  const s = size;
  const eyeH = s * 0.55;
  const stroke = Math.max(1.5, s * 0.1);

  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      {open ? (
        <View style={{
          width: s * 0.9,
          height: eyeH,
          borderRadius: eyeH / 2,
          borderWidth: stroke,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <View style={{
            width: eyeH * 0.46,
            height: eyeH * 0.46,
            borderRadius: eyeH * 0.23,
            backgroundColor: color,
          }} />
        </View>
      ) : (
        <>
          <View style={{
            width: s * 0.9,
            height: eyeH,
            borderTopLeftRadius: eyeH / 2,
            borderTopRightRadius: eyeH / 2,
            borderWidth: stroke,
            borderBottomWidth: 0,
            borderColor: color,
          }} />
          {[-s * 0.22, 0, s * 0.22].map((x, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                bottom: s * 0.05,
                left: s * 0.5 + x - stroke / 2,
                width: stroke,
                height: s * 0.18,
                backgroundColor: color,
                borderRadius: stroke,
              }}
            />
          ))}
        </>
      )}
    </View>
  );
}
