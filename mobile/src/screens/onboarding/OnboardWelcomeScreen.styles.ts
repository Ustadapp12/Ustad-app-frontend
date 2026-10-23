import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightBg },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  avatar: { width: 260, height: 260, marginBottom: 20 },
  heading: { fontFamily: 'Nunito-Bold', fontSize: 28, color: colors.darkText, textAlign: 'center', marginBottom: 10 },
  sub: { fontFamily: 'Nunito-Regular', fontSize: 14, color: colors.mutedText, textAlign: 'center', lineHeight: 20 },
  footer: { paddingHorizontal: 22, paddingTop: 12 },
  btn: {
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 17,
    alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  btnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.white },
});
