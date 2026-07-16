import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useScriptStore } from '../../store/scriptStore';
import { setScriptPreference } from '../../utils/storage';
import { colors } from '../../theme/colors';
import { useResponsiveScale } from '../../utils/responsive';
import type { ScriptPreference } from '../../types/api';
import type { ProfileNavProp } from '../../navigation/types';

interface Props { navigation: ProfileNavProp }

const FONT_OPTIONS: { key: ScriptPreference; label: string; subtitle: string; fontFamily: string; fontSize: number; accentColor: string }[] = [
  { key: 'uthmani',      label: 'Usmani',   subtitle: 'عثماني',      fontFamily: 'NotoNaskhArabic_400Regular', fontSize: 22, accentColor: colors.primary },
  { key: 'nastaliq',     label: 'Indo-Pak', subtitle: 'خط المصحف',   fontFamily: 'AmiriQuran',                 fontSize: 24, accentColor: '#C4A84C'      },
  { key: 'amiri',        label: 'Amiri',    subtitle: 'أميري',        fontFamily: 'AmiriRegular',               fontSize: 22, accentColor: '#8B5CF6'      },
  { key: 'nastaliq_urdu',label: 'Nastaliq', subtitle: 'نستعليق',     fontFamily: 'NotoNastaliqUrdu',           fontSize: 20, accentColor: '#DC2626'      },
];
const PREVIEW = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, learning, logout, deleteAccount } = useAuthStore();
  const { script, setScript } = useScriptStore();
  const sc = useResponsiveScale();
  const styles = useMemo(() => makeStyles(sc), [sc]);

  const displayName = user?.name ?? 'Learner';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [fontModalVisible, setFontModalVisible] = useState(false);

  const currentFont = FONT_OPTIONS.find(f => f.key === script) ?? FONT_OPTIONS[0];

  async function handleSelectFont(key: ScriptPreference) {
    setScript(key);
    await setScriptPreference(key);
    setFontModalVisible(false);
  }

  async function handleLogout() {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => { await logout(); navigation.navigate('Login'); } },
    ]);
  }

  async function handleDeleteAccount() {
    if (!deletePassword.trim()) return;
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      setDeleteModalVisible(false);
      navigation.navigate('Login');
    } catch (e: any) {
      const msg = e?.status === 403 ? 'Incorrect password.' : (e?.message ?? 'Something went wrong.');
      Alert.alert('Error', msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: 'transparent', overflow: 'visible' }]}>
              <Image
                source={require('../../../assets/characters/ayesha.png')}
                style={{ width: 86, height: 86 }}
                resizeMode="contain"
              />
            </View>
            <TouchableOpacity style={styles.editBadge}>
              <Text style={{ fontSize: 12 }}>✏️</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.levelTag}>📖 Hafiz Level: Beginner</Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{learning?.current_streak ?? 0}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={[styles.statCell, styles.statCellBorder]}>
            <Text style={styles.statEmoji}>⚡</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{learning?.xp_total ?? 0}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={[styles.statCell, styles.statCellBorder]}>
            <Text style={styles.statEmoji}>❤️</Text>
            <Text style={[styles.statValue, { color: colors.red }]}>{learning?.hearts_remaining ?? 5}</Text>
            <Text style={styles.statLabel}>Hearts</Text>
          </View>
        </View>

        {/* Section: Learning */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LEARNING</Text>
          <TouchableOpacity style={styles.settingRow} onPress={() => setFontModalVisible(true)}>
            <Text style={styles.settingEmoji}>📜</Text>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Arabic Font</Text>
              <Text style={styles.settingValue}>{currentFont.label}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => navigation.navigate('Streak')}>
            <Text style={styles.settingEmoji}>🔥</Text>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Streak & Rewards</Text>
              <Text style={styles.settingValue}>{learning?.current_streak ?? 0} day streak</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingEmoji}>🎯</Text>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Daily Goal</Text>
              <Text style={styles.settingValue}>2 lessons / day</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingEmoji}>👤</Text>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Edit Profile</Text>
              <Text style={styles.settingValue}>{user?.email ?? ''}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingEmoji}>🔔</Text>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow}>
            <Text style={styles.settingEmoji}>🔒</Text>
            <Text style={styles.settingLabel}>Change Password</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => { setDeletePassword(''); setDeleteModalVisible(true); }}
        >
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>

      {/* Font picker modal */}
      <Modal
        visible={fontModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFontModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { gap: 0 }]}>
            <Text style={[styles.modalTitle, { marginBottom: 4 }]}>Arabic Font</Text>
            <Text style={[styles.modalBody, { marginBottom: 16 }]}>
              Choose how Arabic text appears throughout the app.
            </Text>
            {FONT_OPTIONS.map(f => {
              const active = script === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.fontOption, active && { borderColor: f.accentColor, borderWidth: 2 }]}
                  onPress={() => handleSelectFont(f.key)}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fontOptionLabel}>{f.label}</Text>
                    <Text style={[styles.fontOptionPreview, { fontFamily: f.fontFamily, fontSize: f.fontSize, color: active ? f.accentColor : colors.darkText }]}>
                      {PREVIEW}
                    </Text>
                  </View>
                  <View style={[styles.radio, active && { borderColor: f.accentColor }]}>
                    {active && <View style={[styles.radioDot, { backgroundColor: f.accentColor }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={[styles.modalCancel, { marginTop: 8 }]} onPress={() => setFontModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setDeleteModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalBody}>
              This will permanently delete your account and all progress. Enter your password to confirm.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter your password"
              placeholderTextColor={colors.placeholderText}
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
              editable={!deleting}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, (!deletePassword.trim() || deleting) && { opacity: 0.5 }]}
                onPress={handleDeleteAccount}
                disabled={!deletePassword.trim() || deleting}
              >
                {deleting
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={styles.modalConfirmText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(sc: (n: number) => number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.lightBg },
    statusBar: { paddingHorizontal: sc(24), paddingVertical: sc(6) },
    time: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.darkText },
    avatarCard: {
      alignItems: 'center', paddingVertical: sc(20), paddingHorizontal: sc(22),
      backgroundColor: colors.white, marginHorizontal: sc(16), borderRadius: 20, marginBottom: sc(14),
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
    },
    avatarWrap: { position: 'relative', marginBottom: 10 },
    avatar: {
      width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
    },
    initials: { fontFamily: 'Nunito_700Bold', fontSize: 28, color: 'white' },
    editBadge: {
      position: 'absolute', right: -4, bottom: -4,
      width: 26, height: 26, borderRadius: 13, backgroundColor: colors.gold,
      borderWidth: 2, borderColor: 'white', alignItems: 'center', justifyContent: 'center',
    },
    displayName: { fontFamily: 'Nunito_700Bold', fontSize: 20, color: colors.darkText, marginBottom: 4 },
    levelTag: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: colors.mutedText },
    statsGrid: {
      flexDirection: 'row', backgroundColor: colors.white,
      marginHorizontal: sc(16), borderRadius: 18, marginBottom: sc(14), overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    statCell: { flex: 1, alignItems: 'center', paddingVertical: sc(14), gap: 3 },
    statCellBorder: { borderLeftWidth: 1, borderLeftColor: colors.border },
    statEmoji: { fontSize: 18 },
    statValue: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: colors.darkText },
    statLabel: { fontFamily: 'Nunito_400Regular', fontSize: 9, color: colors.mutedText, letterSpacing: 0.3 },
    section: {
      marginHorizontal: sc(16), marginBottom: sc(12),
      backgroundColor: colors.white, borderRadius: 18, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    sectionTitle: {
      fontFamily: 'Nunito_700Bold', fontSize: 10, color: colors.mutedText,
      letterSpacing: 1.5, paddingHorizontal: sc(18), paddingTop: sc(14), paddingBottom: sc(6),
    },
    settingRow: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingHorizontal: sc(18), paddingVertical: sc(13),
      borderTopWidth: 1, borderTopColor: colors.border,
    },
    settingEmoji: { fontSize: 16 },
    settingContent: { flex: 1 },
    settingLabel: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.darkText },
    settingValue: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: colors.mutedText, marginTop: 1 },
    settingArrow: { fontSize: 18, color: colors.border, fontWeight: '600' },
    logoutBtn: {
      marginHorizontal: sc(16), marginBottom: sc(8), borderRadius: 16, paddingVertical: sc(16),
      alignItems: 'center', backgroundColor: colors.redBg, borderWidth: 1.5, borderColor: '#FCA5A5',
    },
    logoutText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: colors.red },
    deleteBtn: {
      marginHorizontal: sc(16), marginBottom: sc(8), borderRadius: 16, paddingVertical: sc(14),
      alignItems: 'center',
    },
    deleteText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.mutedText },
    // Delete modal
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: sc(24) },
    modalCard: { backgroundColor: colors.white, borderRadius: 20, padding: sc(24), width: '100%', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
    modalTitle: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: colors.darkText, marginBottom: 8 },
    modalBody: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: colors.mutedText, lineHeight: 20, marginBottom: 16 },
    modalInput: {
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
      paddingHorizontal: sc(14), paddingVertical: sc(12),
      fontFamily: 'Nunito_400Regular', fontSize: 14, color: colors.darkText,
      marginBottom: 20,
    },
    modalBtns: { flexDirection: 'row', gap: 10 },
    modalCancel: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingVertical: sc(14), alignItems: 'center' },
    modalCancelText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.midText },
    modalConfirm: { flex: 1, backgroundColor: colors.red, borderRadius: 14, paddingVertical: sc(14), alignItems: 'center' },
    modalConfirmText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: 'white' },
    // Font picker
    fontOption: { backgroundColor: colors.lightBg, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, padding: sc(14), marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
    fontOptionLabel: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.darkText, marginBottom: 6 },
    fontOptionPreview: { textAlign: 'right', lineHeight: 38 },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    radioDot: { width: 11, height: 11, borderRadius: 6 },
  });
}

