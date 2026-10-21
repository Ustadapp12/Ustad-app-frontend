import React from 'react';
import ComingSoonPage from '../comingSoon/ComingSoonPage';

// Its own page, opened by the Pray tab's "Tap to log your Salah" button, with
// the Pray tab highlighted. Salah logging has no backend yet.
export default function LogSalahScreen() {
  return <ComingSoonPage title="Log your Salah" active="star" label="Salah logging is coming soon" />;
}
