import LoadingSpinner from '../../../components/LoadingSpinner';

// ── Between-exercise loading — a spinning green dial + "Loading" label,
// shown briefly while an answer submits and the next exercise is fetched. ──
export function SubmittingSpinner() {
  return <LoadingSpinner size={40} label="Loading…" />;
}
