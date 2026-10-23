import React from 'react';
import { Text } from 'react-native';

// Ayah text with a ۝ end-marker sized to match the surrounding text.
export default function AyahText({ text, style }: { text: string; style: any }) {
  if (!text.includes('۝')) return <Text style={style}>{text}</Text>;
  const parts = text.split('۝');
  const circleSize = style.fontSize ?? 20;
  return (
    <Text style={style}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {part}
          {i < parts.length - 1 && (
            <Text style={{ fontSize: circleSize }}>۝</Text>
          )}
        </React.Fragment>
      ))}
    </Text>
  );
}
