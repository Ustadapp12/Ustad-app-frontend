import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Modal, ActivityIndicator, Linking } from 'react-native';
import LottieView from 'lottie-react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useScriptStore } from '../../store/scriptStore';
import { setScriptPreference } from '../../utils/storage';
import { scriptFontScale, scriptLineHeightScale } from '../../utils/arabicFont';
import { colors } from '../../theme/colors';
import { PRIVACY_URL, TERMS_URL } from '../../config';
import PasswordInput from '../../components/PasswordInput';
import { useResponsiveScale, safeBottomInset } from '../../utils/responsive';
import { isGuest } from '../../utils/guest';
import { characterSrcFor, avatarSrcsForGender, currentAvatarVariantIndex } from '../../utils/avatar';
import { usersApi } from '../../api';
import { ApiError } from '../../api/client';
import { isStreakFrozen } from '../../utils/streak';
import { sendTestNotifications } from '../../services/localNotifications';
import AuthRequiredModal from '../../components/AuthRequiredModal';
import MascotShadow from '../../components/MascotShadow';
import LumoInfoModal from '../../components/LumoInfoModal';
import ReleaseNotesModal from '../../components/ReleaseNotesModal';
import AvatarPickerModal from '../../components/AvatarPickerModal';
import type { ScriptPreference } from '../../types/api';
import type { ProfileNavProp } from '../../navigation/types';
import { APP_VERSION } from '../../utils/appVersion';

interface Props { navigation: ProfileNavProp }

// Base size is the Naskh/Uthmani reference, run through the same sc() device
// scale as the rest of this screen — nastaliq's fontSize/lineHeight are then
// derived from that already-device-scaled base via the same
// scriptFontScale/scriptLineHeightScale used everywhere else (arabicTextStyle),
// so this preview matches both the device and the script's real proportions.
const BASE_FONT_SIZE = 22;
const BASE_LINE_HEIGHT = 38;

const PREVIEW = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

export default function ProfileScreen(props: Props) {
  return <ProfileContent {...props} />;
}

// Generic "no identity yet" avatar for guests — a plain silhouette on a
// neutral grey circle, the same shape most apps fall back to before a real
// profile picture exists, instead of assigning a specific male/female
// character before the user has actually chosen who they are.
function GuestAvatarIcon({ size }: { size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: '#D9DEE3' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="38" r="18" fill="#9AA5B1" />
        <Ellipse cx="50" cy="92" rx="32" ry="28" fill="#9AA5B1" />
      </Svg>
    </View>
  );
}

function ProfileContent({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  const { user, learning, profile, logout, deleteAccount, updateProfileFields } = useAuthStore();
  const { script, setScript } = useScriptStore();
  const sc = useResponsiveScale();
  const styles = useMemo(() => makeStyles(sc), [sc]);
  const isGuestUser = isGuest(user);
  const [authPromptVisible, setAuthPromptVisible] = useState(false);

  // Guests can look around the whole screen (real name, avatar layout — see
  // isGuest's own comment), but every row that would change/persist
  // something, or open a "real" page, needs an account. Wrap those onPress
  // handlers in this instead of calling them directly. Left unwrapped:
  // Feedback (top of Learning) and Website/Join Community/Terms/Privacy
  // (About, at the bottom) — all open to anyone, guest or not.
  function guarded(action: () => void) {
    if (isGuestUser) { setAuthPromptVisible(true); return; }
    action();
  }

  const FONT_OPTIONS = useMemo(() => {
    const fontSize = sc(BASE_FONT_SIZE);
    const lineHeight = sc(BASE_LINE_HEIGHT);
    return [
      { key: 'uthmani' as ScriptPreference, label: 'Usmani', subtitle: 'عثماني', fontFamily: 'NotoNaskhArabic_400Regular', fontSize, lineHeight, accentColor: colors.primary },
      {
        key: 'nastaliq' as ScriptPreference, label: 'Indo-Pak', subtitle: 'خط المصحف', fontFamily: 'NotoNastaliqUrdu',
        fontSize: Math.round(fontSize * scriptFontScale('nastaliq')),
        lineHeight: Math.round(lineHeight * scriptFontScale('nastaliq') * scriptLineHeightScale('nastaliq')),
        accentColor: '#C4A84C',
      },
    ];
  }, [sc]);

  // No gender saved yet (pre-existing accounts from before this feature) —
  // characterSrcFor falls back to the male pool rather than always
  // defaulting to one specific character. Same user id it was assigned
  // under at Welcome, so this is always the one they were introduced to,
  // never a fresh pick — unless profile.avatar_variant is set, in which
  // case that explicit choice always wins.
  const avatarSrc = characterSrcFor(user?.id ?? '', profile?.gender, profile?.avatar_variant);

  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  async function handleSaveAvatarVariant(variant: number) {
    setAvatarSaving(true);
    try {
      await usersApi.updateAvatarVariant(variant);
      updateProfileFields({ avatar_variant: variant });
      setAvatarPickerVisible(false);
    } catch (e) {
      Alert.alert(
        'Something went wrong',
        e instanceof ApiError ? e.message : 'Could not save your avatar. Please try again.',
      );
    } finally {
      setAvatarSaving(false);
    }
  }

  const displayName = user?.name ?? 'Learner';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [fontModalVisible, setFontModalVisible] = useState(false);
  const [releaseNotesVisible, setReleaseNotesVisible] = useState(false);
  const [comingSoonVisible, setComingSoonVisible] = useState(false);

  const currentFont = FONT_OPTIONS.find(f => f.key === script) ?? FONT_OPTIONS[0];

  async function handleSelectFont(key: ScriptPreference) {
    setScript(key);
    await setScriptPreference(key);
    setFontModalVisible(false);
  }

  function comingSoon() {
    setComingSoonVisible(true);
  }

  function openLink(url: string) {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open the link.');
    });
  }

  // Custom Lumo-branded modal instead of the OS Alert.alert (2026-08-28,
  // user: "when asking for logout instead of android popup, create one of
  // ours with lumo asking") -- matches the Delete Account modal's own
  // pattern/styles below (modalBackdrop/modalCard/modalBtns etc.), the only
  // existing precedent in this file, rather than inventing a new visual
  // language for one more confirm dialog.
  function handleLogout() {
    setLogoutModalVisible(true);
  }

  async function confirmLogout() {
    setLogoutModalVisible(false);
    await logout();
    navigation.navigate('Login');
  }

  // Google accounts have no password to confirm with. Absent means an older
  // cached user object, so assume there IS one and keep asking.
  const needsPasswordToDelete = user?.has_password !== false;

  async function handleDeleteAccount() {
    if (needsPasswordToDelete && !deletePassword.trim()) return;
    setDeleting(true);
    try {
      await deleteAccount(needsPasswordToDelete ? deletePassword : undefined);
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
              {isGuestUser ? (
                <GuestAvatarIcon size={sc(86)} />
              ) : (
                <Image
                  source={avatarSrc}
                  style={{ width: sc(86), height: sc(86) }}
                  resizeMode="contain"
                />
              )}
            </View>
            <TouchableOpacity style={styles.editBadge} onPress={() => guarded(() => setAvatarPickerVisible(true))}>
              <Text style={{ fontSize: sc(18) }}>✏️</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.levelTag}>📖 Hafiz Level: Beginner</Text>
        </View>

        {isGuestUser && (
          <View style={styles.guestCard}>
            <Image
              source={require('../../../assets/images/lumo_kufi.png')}
              style={styles.guestCardLuma}
              resizeMode="contain"
            />
            <Text style={styles.guestCardTitle}>You're browsing as a guest</Text>
            <Text style={styles.guestCardBody}>This streak and XP aren't saved yet. Create a free account to keep them and unlock your profile.</Text>
            <TouchableOpacity style={styles.guestCardBtn} onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.guestCardBtnText}>Create account</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statCell}
            activeOpacity={0.7}
            onPress={() => guarded(() => navigation.navigate('Streak'))}
          >
            {/* Animated flame, not the old static emoji/frozen-icon — same
                streak.json/streak_frozen.json Lottie pair StreakScreen's own
                hero animation uses, just at settings-icon scale. Tappable
                now too, replacing the separate "Streak & Rewards" row that
                used to live in the LEARNING section below (removed —
                redundant with this once it does the same thing). */}
            <LottieView
              renderMode="SOFTWARE"
              source={isStreakFrozen(learning?.streak_state)
                ? require('../../../assets/animations/streak_frozen.json')
                : require('../../../assets/animations/streak.json')}
              autoPlay loop
              style={styles.statStreakAnim}
            />
            <Text style={styles.statValue}>{isGuestUser ? '—' : (learning?.current_streak ?? 0)}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCell, styles.statCellBorder]}
            activeOpacity={0.7}
            onPress={() => guarded(() => navigation.navigate('XP'))}
          >
            <Text style={styles.statEmoji}>⚡</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{isGuestUser ? '—' : (learning?.xp_total ?? 0)}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </TouchableOpacity>
        </View>

        {/* Feedback — its own standalone card, not nested inside the LEARNING
            section below. It used to sit inside that section's shared
            rounded/clipped container, which cut off its green accent border
            at the top edge. Deliberately not wrapped in `guarded()` — it's
            open to guests same as everything in ABOUT below. */}
        <TouchableOpacity style={styles.feedbackCard} onPress={() => navigation.navigate('Feedback')} activeOpacity={0.85}>
          <Text style={styles.settingEmoji}>💬</Text>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Feedback</Text>
            <Text style={styles.settingValue}>Tell us what you think</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>

        {/* Section: Learning */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LEARNING</Text>
          <TouchableOpacity style={styles.settingRow} onPress={() => guarded(() => setFontModalVisible(true))}>
            <Text style={styles.settingEmoji}>📜</Text>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Arabic Font</Text>
              <Text style={styles.settingValue}>{currentFont.label}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => guarded(comingSoon)}>
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
          <TouchableOpacity style={styles.settingRow} onPress={() => guarded(() => navigation.navigate('EditProfile'))}>
            <Text style={styles.settingEmoji}>👤</Text>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Edit Profile</Text>
              <Text style={styles.settingValue}>{user?.email ?? ''}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => guarded(comingSoon)}>
            <Text style={styles.settingEmoji}>🔔</Text>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => guarded(() => navigation.navigate('ChangePassword'))}>
            <Text style={styles.settingEmoji}>🔒</Text>
            <Text style={styles.settingLabel}>Change Password</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Section: About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <TouchableOpacity style={styles.settingRow} onPress={() => openLink('https://ustadapp.com')}>
            <Text style={styles.settingEmoji}>🌐</Text>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Visit Website</Text>
              <Text style={styles.settingValue}>ustadapp.com</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => openLink('https://chat.whatsapp.com/FM4p2nZu94XJ5NGg9qKXd2')}>
            <Text style={styles.settingEmoji}>👥</Text>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Join Community</Text>
              <Text style={styles.settingValue}>Chat with other learners on WhatsApp</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          {/* Reachable after sign-up too, not only from the checkbox someone
              ticked once. Play expects both documents findable in the app. */}
          <TouchableOpacity style={styles.settingRow} onPress={() => openLink(TERMS_URL)}>
            <Text style={styles.settingEmoji}>📄</Text>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Terms of Service</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => openLink(PRIVACY_URL)}>
            <Text style={styles.settingEmoji}>🔐</Text>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => guarded(handleLogout)}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => guarded(() => { setDeletePassword(''); setDeleteModalVisible(true); })}
        >
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        {/* TEMP DEBUG: fires all 6 notification types 5s apart so they can be
            previewed on a real device without waiting for real trigger times.
            Remove before publishing. */}
        <TouchableOpacity
          style={[styles.deleteBtn, { borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, marginTop: 4 }]}
          onPress={async () => {
            const result = await sendTestNotifications();
            if (result.ok) {
              Alert.alert('Test notifications scheduled', `${result.count} notifications will fire 5 seconds apart, starting now. Lock your phone or leave the app to see them.`);
            } else {
              Alert.alert('Could not schedule', result.reason ?? 'Unknown error.');
            }
          }}
        >
          <Text style={[styles.deleteText, { color: colors.primary }]}>🔔 Test Notifications (dev only)</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setReleaseNotesVisible(true)}>
          <Text style={[styles.versionText, styles.versionTextLink]}>v{APP_VERSION}</Text>
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
            <View style={styles.fontModalHeader}>
              <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Arabic Font</Text>
            </View>
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
                    <Text style={[styles.fontOptionPreview, { fontFamily: f.fontFamily, fontSize: f.fontSize, lineHeight: f.lineHeight, color: active ? f.accentColor : colors.darkText }]}>
                      {PREVIEW}
                    </Text>
                  </View>
                  <View style={[styles.radio, active && { borderColor: f.accentColor }]}>
                    {active && <View style={[styles.radioDot, { backgroundColor: f.accentColor }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
            {/* Labeled "Save and Close", not "Cancel" — handleSelectFont
                already persists the choice the instant an option is tapped
                (setScript + setScriptPreference), so this button never had
                anything left to cancel. It only closes the sheet. */}
            <TouchableOpacity style={[styles.modalCancel, { marginTop: 8 }]} onPress={() => setFontModalVisible(false)}>
              <Text style={styles.modalCancelText}>Save and Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Log Out Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ width: sc(72), height: sc(72), alignSelf: 'center', marginBottom: sc(4) }}>
              <Image
                source={require('../../../assets/images/lumo_kufi.png')}
                style={[styles.deleteLumo, { marginBottom: 0 }]}
                resizeMode="contain"
              />
              <MascotShadow width={sc(72)} />
            </View>
            <Text style={styles.modalTitle}>Log out?</Text>
            <Text style={styles.modalBody}>Are you sure you want to log out?</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setLogoutModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={() => void confirmLogout()}>
                <Text style={styles.modalConfirmText}>Log out</Text>
              </TouchableOpacity>
            </View>
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
            <View style={{ width: sc(72), height: sc(72), alignSelf: 'center', marginBottom: sc(4) }}>
              <Image
                source={require('../../../assets/images/lumo_cry.png')}
                style={[styles.deleteLumo, { marginBottom: 0 }]}
                resizeMode="contain"
              />
              <MascotShadow width={sc(72)} />
            </View>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalBody}>
              {needsPasswordToDelete
                ? 'This will permanently delete your account and all progress. Enter your password to confirm.'
                : 'This will permanently delete your account and all progress. This cannot be undone.'}
            </Text>
            {needsPasswordToDelete && (
              <View style={styles.modalInputBox}>
                <PasswordInput
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  placeholder="Enter your password"
                  editable={!deleting}
                  autoFocus
                />
              </View>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, ((needsPasswordToDelete && !deletePassword.trim()) || deleting) && { opacity: 0.5 }]}
                onPress={handleDeleteAccount}
                disabled={(needsPasswordToDelete && !deletePassword.trim()) || deleting}
              >
                {deleting
                  ? <ActivityIndicator color="white" size="small" />
                  : <Text style={styles.modalConfirmText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <LumoInfoModal
        visible={comingSoonVisible}
        onClose={() => setComingSoonVisible(false)}
      />

      <ReleaseNotesModal
        visible={releaseNotesVisible}
        onClose={() => setReleaseNotesVisible(false)}
      />

      {!isGuestUser && (
        <AvatarPickerModal
          visible={avatarPickerVisible}
          variantSrcs={avatarSrcsForGender(profile?.gender)}
          initialVariant={currentAvatarVariantIndex(user?.id ?? '', profile?.avatar_variant)}
          saving={avatarSaving}
          onSave={handleSaveAvatarVariant}
          onClose={() => setAvatarPickerVisible(false)}
        />
      )}

      <AuthRequiredModal
        visible={authPromptVisible}
        title="Create an account"
        body="Guests can look around, but saving progress, editing your profile, and account settings need a free account."
        ctaLabel="Create account"
        dismissLabel="Not now"
        onContinue={() => { setAuthPromptVisible(false); navigation.navigate('SignUp'); }}
        onDismiss={() => setAuthPromptVisible(false)}
      />
    </View>
  );
}

function makeStyles(sc: (n: number) => number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.lightBg },
    statusBar: { paddingHorizontal: sc(24), paddingVertical: sc(6) },
    time: { fontFamily: 'Nunito_700Bold', fontSize: sc(15), color: colors.darkText },
    avatarCard: {
      alignItems: 'center', paddingVertical: sc(14), paddingHorizontal: sc(22),
      backgroundColor: colors.white, marginHorizontal: sc(16), borderRadius: sc(20), marginBottom: sc(10),
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
    },
    avatarWrap: { position: 'relative', marginBottom: sc(6) },
    avatar: {
      width: sc(80), height: sc(80), borderRadius: sc(40), backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
    },
    initials: { fontFamily: 'Nunito_700Bold', fontSize: sc(28), color: 'white' },
    editBadge: {
      position: 'absolute', right: -4, bottom: -4,
      width: sc(26), height: sc(26), alignItems: 'center', justifyContent: 'center',
    },
    displayName: { fontFamily: 'Nunito_700Bold', fontSize: sc(20), color: colors.darkText, marginBottom: 4 },
    levelTag: { fontFamily: 'Nunito_700Bold', fontSize: sc(12), color: colors.mutedText },
    // Vertical hero layout — same size/shape Lumo gets everywhere else
    // (Auth/Onboarding/Feedback), not the old cramped horizontal row.
    guestCard: {
      backgroundColor: colors.white, borderRadius: sc(18), padding: sc(16),
      marginHorizontal: sc(16), marginBottom: sc(10),
      alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
    },
    guestCardLuma: { width: sc(100), height: sc(100), marginBottom: sc(8) },
    guestCardTitle: { fontFamily: 'Nunito_700Bold', fontSize: sc(17), color: colors.darkText, marginBottom: 4, textAlign: 'center' },
    guestCardBody: { fontFamily: 'Nunito_400Regular', fontSize: sc(13), color: colors.mutedText, lineHeight: sc(19), textAlign: 'center', marginBottom: sc(14) },
    guestCardBtn: { alignSelf: 'stretch', backgroundColor: colors.primary, borderRadius: sc(14), paddingVertical: sc(13), alignItems: 'center' },
    guestCardBtnText: { fontFamily: 'Nunito_700Bold', fontSize: sc(14), color: colors.white },
    statsGrid: {
      flexDirection: 'row', backgroundColor: colors.white,
      marginHorizontal: sc(16), borderRadius: sc(18), marginBottom: sc(10), overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    statCell: { flex: 1, alignItems: 'center', paddingVertical: sc(10), gap: 3 },
    statCellBorder: { borderLeftWidth: 1, borderLeftColor: colors.border },
    statEmoji: { fontSize: sc(18) },
    // Bigger than the plain emoji it replaces (statEmoji, sc(18)) — an
    // animation this small barely reads as moving at all.
    statStreakAnim: { width: sc(28), height: sc(28) },
    statValue: { fontFamily: 'Nunito_700Bold', fontSize: sc(18), color: colors.darkText },
    statLabel: { fontFamily: 'Nunito_400Regular', fontSize: sc(9), color: colors.mutedText, letterSpacing: 0.3 },
    section: {
      marginHorizontal: sc(16), marginBottom: sc(8),
      backgroundColor: colors.white, borderRadius: sc(18), overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    sectionTitle: {
      fontFamily: 'Nunito_700Bold', fontSize: sc(10), color: colors.mutedText,
      letterSpacing: 1.5, paddingHorizontal: sc(18), paddingTop: sc(10), paddingBottom: sc(4),
    },
    settingRow: {
      flexDirection: 'row', alignItems: 'center', gap: sc(14),
      paddingHorizontal: sc(18), paddingVertical: sc(10),
      borderTopWidth: 1, borderTopColor: colors.border,
    },
    // Standalone card, not nested inside another rounded/clipped section —
    // a full, uncut green border on all sides with its own shadow so it
    // actually pops off the page instead of blending into the row list.
    // For guests and signed-in users alike, since Feedback is open to both.
    feedbackCard: {
      flexDirection: 'row', alignItems: 'center', gap: sc(14),
      marginHorizontal: sc(16), marginBottom: sc(10),
      paddingHorizontal: sc(18), paddingVertical: sc(14),
      borderRadius: sc(16), borderWidth: 2, borderColor: '#05966A', backgroundColor: '#EAF7F1',
      shadowColor: '#05966A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 6, elevation: 3,
    },
    settingEmoji: { fontSize: sc(16) },
    settingIcon: { width: sc(16), height: sc(16) },
    settingContent: { flex: 1 },
    settingLabel: { fontFamily: 'Nunito_700Bold', fontSize: sc(14), color: colors.darkText },
    settingValue: { fontFamily: 'Nunito_400Regular', fontSize: sc(11), color: colors.mutedText, marginTop: 1 },
    settingArrow: { fontSize: sc(18), color: colors.border, fontWeight: '600' },
    logoutBtn: {
      marginHorizontal: sc(16), marginBottom: sc(6), borderRadius: sc(16), paddingVertical: sc(13),
      alignItems: 'center', backgroundColor: colors.redBg, borderWidth: 1.5, borderColor: '#FCA5A5',
    },
    logoutText: { fontFamily: 'Nunito_700Bold', fontSize: sc(15), color: colors.red },
    deleteBtn: {
      marginHorizontal: sc(16), marginBottom: sc(6), borderRadius: sc(16), paddingVertical: sc(11),
      alignItems: 'center',
    },
    deleteText: { fontFamily: 'Nunito_700Bold', fontSize: sc(13), color: colors.mutedText },
    versionText: { fontFamily: 'Nunito_400Regular', fontSize: sc(11), color: colors.mutedText, textAlign: 'center', marginTop: sc(20) },
    versionTextLink: { textDecorationLine: 'underline' },
    // Delete modal
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: sc(24) },
    modalCard: { backgroundColor: colors.white, borderRadius: sc(20), padding: sc(24), width: '100%', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 },
    deleteLumo: { width: sc(72), height: sc(72), alignSelf: 'center', marginBottom: sc(4) },
    modalTitle: { fontFamily: 'Nunito_700Bold', fontSize: sc(18), color: colors.darkText, marginBottom: sc(8), textAlign: 'center' },
    modalBody: { fontFamily: 'Nunito_400Regular', fontSize: sc(13), color: colors.mutedText, lineHeight: 20, marginBottom: sc(16) },
    modalInputBox: {
      borderWidth: 1.5, borderColor: colors.border, borderRadius: sc(12),
      paddingHorizontal: sc(14), paddingVertical: sc(12),
      marginBottom: sc(20),
    },
    modalBtns: { flexDirection: 'row', gap: sc(10) },
    modalCancel: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: sc(14), paddingVertical: sc(14), alignItems: 'center' },
    modalCancelText: { fontFamily: 'Nunito_700Bold', fontSize: sc(14), color: colors.darkText },
    modalConfirm: { flex: 1, backgroundColor: colors.red, borderRadius: sc(14), paddingVertical: sc(14), alignItems: 'center' },
    modalConfirmText: { fontFamily: 'Nunito_700Bold', fontSize: sc(14), color: 'white' },
    // Font picker
    fontModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    fontOption: { backgroundColor: colors.lightBg, borderRadius: sc(16), borderWidth: 1.5, borderColor: colors.border, padding: sc(14), marginBottom: sc(10), flexDirection: 'row', alignItems: 'center', gap: sc(12) },
    fontOptionLabel: { fontFamily: 'Nunito_700Bold', fontSize: sc(14), color: colors.darkText, marginBottom: sc(6) },
    fontOptionPreview: { textAlign: 'right' },
    radio: { width: sc(22), height: sc(22), borderRadius: sc(11), borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    radioDot: { width: sc(11), height: sc(11), borderRadius: sc(6) },
  });
}

