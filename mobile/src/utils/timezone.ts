/** Device's IANA timezone (e.g. "Asia/Karachi") — Hermes supports Intl natively on RN 0.85+. */
export function getDeviceTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
