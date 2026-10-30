import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, Modal, ActivityIndicator, Linking, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useScriptStore } from '../../store/scriptStore';
import { setScriptPreference } from '../../utils/storage';
import { scriptFontScale, scriptLineHeightScale } from '../../utils/arabicFont';
import { colors } from '../../theme';
import { PRIVACY_URL, TERMS_URL } from '../../config';
import PasswordInput from '../../components/PasswordInput';
import { useResponsiveScale, safeBottomInset } from '../../utils/responsive';
import { characterSrcFor, avatarSrcsForGender, currentAvatarVariantIndex } from '../../utils/avatar';
import { ApiError } from '../../api/client';
import { isStreakFrozen } from '../../utils/streak';
import AuthRequiredModal from '../../components/AuthRequiredModal';
import MascotShadow from '../../components/MascotShadow';
import LumoInfoModal from '../../components/LumoInfoModal';
import ReleaseNotesModal from '../../components/ReleaseNotesModal';
import AvatarPickerModal from '../../components/AvatarPickerModal';
import type { ScriptPreference } from '../../types/api';
import type { ProfileNavProp } from '../../navigation/types';
import { APP_VERSION } from '../../utils/appVersion';
import { selectUserId, selectUserEmail, selectUserName, selectHasPassword, selectXpTotal, selectCurrentStreak, selectStreakState, selectGender, selectAvatarVariant, selectLogout, selectDeleteAccount, selectIsGuest } from '../../store/selectors/auth';
import { makeStyles } from './ProfileScreen.styles';
import { ANIMATIONS, MASCOT } from '../../assets';
import { useProfileActions } from '../../hooks/api';

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
    <View style={[avatarStyles.guestAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="38" r="18" fill="#9AA5B1" />
        <Ellipse cx="50" cy="92" rx="32" ry="28" fill="#9AA5B1" />
      </Svg>
    </View>
  );
}

function ProfileContent({ navigation }: Props) {
  const rawInsets = useSafeAreaInsets();
  // The streak flame is a looping Lottie on a tab screen, so without this it
  // keeps rendering frames the whole time the user is on the map. Paused on
  // blur and resumed on focus; the view stays mounted so the row doesn't
  // reflow when you switch tabs.
  const isFocused = useIsFocused();
  const flameRef = useRef<LottieView>(null);
  useEffect(() => {
    if (isFocused) flameRef.current?.play();
    else flameRef.current?.pause();
  }, [isFocused]);
  const insets = { ...rawInsets, bottom: safeBottomInset(rawInsets.bottom) };
  // Exact values only (store/selectors/auth.ts), never the whole store.
  const userId = useAuthStore(selectUserId);
  const userEmail = useAuthStore(selectUserEmail);
  const userName = useAuthStore(selectUserName);
  const userHasPassword = useAuthStore(selectHasPassword);
  const xpTotal = useAuthStore(selectXpTotal);
  const currentStreak = useAuthStore(selectCurrentStreak);
  const streakState = useAuthStore(selectStreakState);
  const profileGender = useAuthStore(selectGender);
  const profileAvatarVariant = useAuthStore(selectAvatarVariant);
  const logout = useAuthStore(selectLogout);
  const deleteAccount = useAuthStore(selectDeleteAccount);
  const { saveAvatarVariant } = useProfileActions();
  const script = useScriptStore(s => s.script);
  const setScript = useScriptStore(s => s.setScript);
  const sc = useResponsiveScale();
  const styles = useMemo(() => makeStyles(sc), [sc]);
  const isGuestUser = useAuthStore(selectIsGuest);
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
      { key: 'uthmani' as ScriptPreference, label: 'Usmani', subtitle: 'عثماني', fontFamily: 'NotoNaskhArabic-Regular', fontSize, lineHeight, accentColor: colors.primary },
      {
        key: 'nastaliq' as ScriptPreference, label: 'Indo-Pak', subtitle: 'خط المصحف', fontFamily: 'NotoNastaliqUrdu-Regular',
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
  // never a fresh pick — unless profileAvatarVariant is set, in which
  // case that explicit choice always wins.
  const avatarSrc = characterSrcFor(userId ?? '', profileGender, profileAvatarVariant);

  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  async function handleSaveAvatarVariant(variant: number) {
    setAvatarSaving(true);
    try {
      await saveAvatarVariant(variant);
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

  const displayName = userName ?? 'Learner';

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
  const needsPasswordToDelete = userHasPassword !== false;

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
      <ScrollView style={styles.fill} showsVerticalScrollIndicator={false}>
        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
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
              source={MASCOT.lumoKufi}
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
              ref={flameRef}
              source={isStreakFrozen(streakState)
                ? ANIMATIONS.streakFrozen
                : ANIMATIONS.streak}
              autoPlay loop
              style={styles.statStreakAnim}
            />
            <Text style={styles.statValue}>{isGuestUser ? '—' : (currentStreak ?? 0)}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statCell, styles.statCellBorder]}
            activeOpacity={0.7}
            onPress={() => guarded(() => navigation.navigate('XP'))}
          >
            <Text style={styles.statEmoji}>⚡</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{isGuestUser ? '—' : (xpTotal ?? 0)}</Text>
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
              <Text style={styles.settingValue}>{userEmail ?? ''}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
          {/* Hidden 2026-09-16: this was only ever a "coming soon" stub with no
              real notification settings behind it — not worth shipping to
              production. Re-add once there's an actual reminder-hour picker /
              notification preferences screen to link to. */}
          {/* <TouchableOpacity style={styles.settingRow} onPress={() => guarded(comingSoon)}>
            <Text style={styles.settingEmoji}>🔔</Text>
            <Text style={styles.settingLabel}>Notifications</Text>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity> */}
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

        {/* Dev-only test button removed 2026-09-16 for the first production
            build, per its own "remove before publishing" note. Real
            notification scheduling (refreshLocalNotifications) is untouched —
            this was only a manual preview trigger, not part of the real flow. */}

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
          <View style={[styles.modalCard, styles.modalCardTight]}>
            <View style={styles.fontModalHeader}>
              <Text style={[styles.modalTitle, styles.modalTitleFlush]}>Arabic Font</Text>
            </View>
            <Text style={[styles.modalBody, styles.modalBodySpaced]}>
              Choose how Arabic text appears throughout the app.
            </Text>
            {FONT_OPTIONS.map(f => {
              const active = script === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.fontOption, active && [styles.fontOptionSelected, { borderColor: f.accentColor }]]}
                  onPress={() => handleSelectFont(f.key)}
                  activeOpacity={0.85}
                >
                  <View style={styles.fill}>
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
            {/* flex:0 + alignSelf:'stretch' override styles.modalCancel's own
                flex:1 — that's meant for sitting beside modalConfirm inside
                modalBtns' row layout (Logout/Delete modals), which collapses
                or misrenders its content here since this button stands alone
                in a plain column container instead. */}
            <TouchableOpacity style={[styles.modalCancel, styles.modalCancelFull]} onPress={() => setFontModalVisible(false)}>
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
            <View style={styles.mascotBox}>
              <Image
                source={MASCOT.lumoKufi}
                style={[styles.deleteLumo, styles.mascotImgFlush]}
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
            <View style={styles.mascotBox}>
              <Image
                source={MASCOT.lumoCry}
                style={[styles.deleteLumo, styles.mascotImgFlush]}
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
                style={[styles.modalConfirm, ((needsPasswordToDelete && !deletePassword.trim()) || deleting) && styles.modalConfirmDisabled]}
                onPress={handleDeleteAccount}
                disabled={(needsPasswordToDelete && !deletePassword.trim()) || deleting}
              >
                {deleting
                  ? <ActivityIndicator color="#F5F7FA" size="small" />
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
          variantSrcs={avatarSrcsForGender(profileGender)}
          initialVariant={currentAvatarVariantIndex(userId ?? '', profileAvatarVariant, profileGender)}
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

const avatarStyles = StyleSheet.create({
  guestAvatar: { overflow: 'hidden', backgroundColor: '#D9DEE3' },
});
