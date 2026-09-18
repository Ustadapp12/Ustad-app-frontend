import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { STREAK_ACTIVE_ICON_SMALL, STREAK_FROZEN_ICON_SMALL, STREAK_BLANK_ICON } from '../utils/streak';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface Props {
  /** Local calendar date (YYYY-MM-DD) the account was created — the earliest month. */
  startDate: string;
  /** Local dates (YYYY-MM-DD) where a session that day actually advanced the streak. */
  practicedDates: string[];
  /** Local dates (YYYY-MM-DD) the freeze policy shows as frozen that day. */
  frozenDates: string[];
}

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Duolingo-style practice calendar — one month at a time, current month
 * first, paged sideways with the arrow buttons instead of a long vertical scroll.
 * Real data only: the orange flame icon for a day that actually advanced the
 * streak, the blue flame icon for a day the freeze policy shows as frozen
 * (both from the backend's replay of the real policy against session
 * history — see _replay_streak_calendar). The animated Lottie flame is
 * reserved for the one big hero flame on the streak page itself; every
 * calendar day is the static icon, same as the blank/unlit one, so 30+ cells
 * don't all try to animate at once. Days before signup or after today, and
 * any day that's neither practiced nor frozen, just show a bare, muted date
 * number with the static blank flame instead of a guessed state.
 */
export default function StreakCalendar({ startDate, practicedDates, frozenDates }: Props) {
  const practicedSet = React.useMemo(() => new Set(practicedDates), [practicedDates]);
  const frozenSet = React.useMemo(() => new Set(frozenDates), [frozenDates]);
  const start = React.useMemo(() => parseISODate(startDate), [startDate]);
  const today = React.useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = React.useState(today.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(today.getMonth());
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  const atEarliest = viewYear === start.getFullYear() && viewMonth === start.getMonth();
  const atLatest = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  function step(direction: 1 | -1) {
    if (direction === 1 && atLatest) return;
    if (direction === -1 && atEarliest) return;
    let ny = viewYear;
    let nm = viewMonth + direction;
    if (nm > 11) { nm = 0; ny += 1; }
    if (nm < 0) { nm = 11; ny -= 1; }
    Animated.timing(slideAnim, { toValue: direction * -28, duration: 120, useNativeDriver: true }).start(() => {
      setViewYear(ny);
      setViewMonth(nm);
      slideAnim.setValue(direction * 28);
      Animated.timing(slideAnim, { toValue: 0, duration: 170, useNativeDriver: true }).start();
    });
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Practice Calendar</Text>

      <View style={styles.monthNav}>
        <TouchableOpacity
          onPress={() => step(-1)}
          disabled={atEarliest}
          style={[styles.navBtn, atEarliest && styles.navBtnDisabled]}
        >
          <Text style={[styles.navBtnText, atEarliest && styles.navBtnTextDisabled]}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <TouchableOpacity
          onPress={() => step(1)}
          disabled={atLatest}
          style={[styles.navBtn, atLatest && styles.navBtnDisabled]}
        >
          <Text style={[styles.navBtnText, atLatest && styles.navBtnTextDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
        <MonthGrid
          year={viewYear}
          month={viewMonth}
          today={today}
          startDate={start}
          practicedSet={practicedSet}
          frozenSet={frozenSet}
        />
      </Animated.View>
    </View>
  );
}

function MonthGrid({ year, month, today, startDate, practicedSet, frozenSet }: {
  year: number; month: number; today: Date; startDate: Date; practicedSet: Set<string>; frozenSet: Set<string>;
}) {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();

  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const startFloor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

  return (
    <View>
      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map(w => (
          <Text key={w} style={styles.weekdayLabel}>{w}</Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (day === null) return <View key={di} style={styles.dayCell} />;
            const cellDate = new Date(year, month, day);
            const beforeStart = cellDate < startFloor;
            const isFuture = cellDate > today;
            const inRange = !beforeStart && !isFuture;
            const iso = isoDate(year, month, day);
            const practiced = inRange && practicedSet.has(iso);
            const frozen = inRange && !practiced && frozenSet.has(iso);
            const icon = practiced ? STREAK_ACTIVE_ICON_SMALL : frozen ? STREAK_FROZEN_ICON_SMALL : STREAK_BLANK_ICON;
            return (
              <View key={di} style={styles.dayCell}>
                {inRange ? (
                  <Image source={icon} style={styles.dayFlame} resizeMode="contain" />
                ) : (
                  <View style={styles.dayFlame} />
                )}
                <Text style={[styles.dayNum, !inRange && styles.dayNumMuted]}>{day}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%', backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.darkText, marginBottom: 14 },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  monthTitle: { fontFamily: 'Nunito-Bold', fontSize: 14, color: colors.darkText },
  navBtn: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: colors.lightBg,
    alignItems: 'center', justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { fontFamily: 'Nunito-Bold', fontSize: 16, color: colors.midText, marginTop: -2 },
  navBtnTextDisabled: { color: colors.mutedText },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayLabel: { flex: 1, textAlign: 'center', fontFamily: 'Nunito-Bold', fontSize: 11, color: colors.mutedText },
  dayCell: { flex: 1, alignItems: 'center' },
  dayFlame: { width: 22, height: 22, marginBottom: 2 },
  dayNum: { fontFamily: 'Nunito-Bold', fontSize: 11, color: colors.darkText },
  dayNumMuted: { color: colors.mutedText, opacity: 0.4 },
});
