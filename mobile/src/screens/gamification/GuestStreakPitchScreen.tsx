import React from 'react';
import GuestGate from '../../components/GuestGate';

// The screen guests land on after every single post-lesson streak
// celebration (see StreakCelebrationScreen) — deliberately shown every level,
// not just once, since a guest's streak is never saved at all (pinned to 0
// on the celebration screen above this one). Reuses GuestGate's existing
// full-page pitch (same component used for Quests/Leaderboard/Profile) with
// copy specific to this moment.
export default function GuestStreakPitchScreen() {
  return (
    <GuestGate
      feature="Your streak"
      title="Create your streak"
      body="Guest progress isn't saved — that streak resets every time. Create a free account, it's free, and today becomes day one for real."
    />
  );
}
