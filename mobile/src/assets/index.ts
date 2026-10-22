// Every image and animation the app loads, named once. Screens import
// from here (import { MASCOT } from '../../assets') instead of writing
// require('../../../assets/...') paths. Avatars live in utils/avatar.ts and
// the map's art in screens/home/map2/assets.ts, which were already central.
// (2026-10-22)

export const ANIMATIONS = {
  allday: require('../../assets/shared/animations/allday.json'),
  celebration: require('../../assets/shared/animations/celebration.json'),
  congrats: require('../../assets/shared/animations/congrats.json'),
  listen: require('../../assets/shared/animations/listen.json'),
  loading: require('../../assets/shared/animations/loading.json'),
  n1day: require('../../assets/shared/animations/1day.json'),
  n404: require('../../assets/shared/animations/404.json'),
  n7thday: require('../../assets/shared/animations/7thday.json'),
  streak: require('../../assets/shared/animations/streak.json'),
  streakFrozen: require('../../assets/shared/animations/streak_frozen.json'),
  wave: require('../../assets/shared/animations/wave.json'),
  writingOnBook: require('../../assets/shared/animations/writing_on_book.json'),
} as const;

export const AUTH_IMAGES = {
  mail: require('../../assets/screens/auth/mail.png'),
  password: require('../../assets/screens/auth/password.png'),
} as const;

export const FIRE = {
  blankFire: require('../../assets/shared/fire/blank_fire.png'),
  blueFire30: require('../../assets/shared/fire/blue_fire_30.png'),
  blueFire60: require('../../assets/shared/fire/blue_fire_60.png'),
  frozen: require('../../assets/shared/fire/frozen.png'),
  orangeFire30: require('../../assets/shared/fire/orange_fire_30.png'),
  orangeFire60: require('../../assets/shared/fire/orange_fire_60.png'),
} as const;

export const GAMIFICATION_IMAGES = {
  halfh: require('../../assets/screens/gamification/halfh.png'),
  redh: require('../../assets/screens/gamification/redh.png'),
  whiteh: require('../../assets/screens/gamification/whiteh.png'),
} as const;

export const HOME_IMAGES = {
  mapFeatureButton: require('../../assets/screens/home/map_feature_button.png'),
  statGems: require('../../assets/screens/home/map2/images/stat_gems.png'),
} as const;

export const ICONS = {
  backArrow: require('../../assets/shared/icons/back_arrow.png'),
  chest: require('../../assets/shared/icons/chest.png'),
  eye: require('../../assets/shared/icons/eye.png'),
  hide: require('../../assets/shared/icons/hide.png'),
  hintBadge: require('../../assets/shared/icons/hint_badge.png'),
} as const;

export const LESSON_IMAGES = {
  ayesha: require('../../assets/screens/lesson/legacy-characters/ayesha.png'),
  farah: require('../../assets/screens/lesson/legacy-characters/farah.png'),
  fatima: require('../../assets/screens/lesson/legacy-characters/fatima.png'),
  hamza: require('../../assets/screens/lesson/legacy-characters/hamza.png'),
  lumoRead: require('../../assets/screens/lesson/lumo_read.png'),
  mic: require('../../assets/screens/lesson/mic.png'),
  muhammad: require('../../assets/screens/lesson/legacy-characters/muhammad.png'),
  speaker: require('../../assets/screens/lesson/speaker.png'),
  umar: require('../../assets/screens/lesson/legacy-characters/umar.png'),
  waleed: require('../../assets/screens/lesson/legacy-characters/waleed.png'),
} as const;

export const MASCOT = {
  lumoCry: require('../../assets/shared/mascot/lumo_cry.png'),
  lumoHint: require('../../assets/shared/mascot/lumo_hint.png'),
  lumoKufi: require('../../assets/shared/mascot/lumo_kufi.png'),
  lumoSad: require('../../assets/shared/mascot/lumo_sad.png'),
  lumoTransparent: require('../../assets/shared/mascot/lumo_transparent.png'),
  lumoXp: require('../../assets/shared/mascot/lumo_xp.png'),
} as const;

export const QUEST_IMAGES = {
  mascot: require('../../assets/screens/quests/mascot.png'),
} as const;
