import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Image, StyleSheet, type TextInputProps, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { colors } from '../theme/colors';

const EYE_SRC = require('../../assets/images/eye.png');
const HIDE_SRC = require('../../assets/images/hide.png');

interface Props extends Omit<TextInputProps, 'secureTextEntry' | 'style'> {
  value: string;
  onChangeText: (t: string) => void;
  inputStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

// Shared show/hide password field — eye.png (open eye, tap to reveal) when
// hidden, hide.png (crossed-out eye, tap to hide) when visible. Every screen
// with a password field used to hand-roll its own "SHOW"/"HIDE" text toggle;
// this replaces all of them with the same icon-based control.
export default function PasswordInput({ value, onChangeText, inputStyle, containerStyle, ...rest }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={[styles.row, containerStyle]}>
      <TextInput
        style={[styles.input, inputStyle]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.placeholderText}
        secureTextEntry={!visible}
        autoCapitalize="none"
        {...rest}
      />
      <TouchableOpacity
        onPress={() => setVisible(v => !v)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      >
        <Image source={visible ? HIDE_SRC : EYE_SRC} style={styles.icon} resizeMode="contain" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, fontFamily: 'Nunito_400Regular', fontSize: 15, color: colors.darkText },
  icon: { width: 20, height: 20, marginLeft: 10 },
});
