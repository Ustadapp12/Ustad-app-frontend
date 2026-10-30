// Islamic (Hijri) date for display. Spelled without hyphens or apostrophes
// on purpose: in-app copy never uses dash punctuation.
const HIJRI_MONTHS = [
  'Muharram', 'Safar', 'Rabi al Awwal', 'Rabi al Akhir',
  'Jumada al Ula', 'Jumada al Akhirah', 'Rajab', 'Shaban',
  'Ramadan', 'Shawwal', 'Dhul Qadah', 'Dhul Hijjah',
];

interface HijriDate { day: number; month: number; year: number } // month is 1..12

/** Umm al-Qura via the platform's ICU calendar when the JS engine exposes
 * it, which is what most users' phones and local masjids follow. Returns
 * null when unsupported (Hermes builds without full Intl just echo the
 * Gregorian calendar back), so the caller falls through to tabular. */
function fromIntl(date: Date): HijriDate | null {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'numeric', year: 'numeric',
    }).formatToParts(date);
    const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '', 10);
    const day = get('day'), month = get('month'), year = get('year');
    if (year >= 1400 && year < 1600 && month >= 1 && month <= 12 && day >= 1 && day <= 30) {
      return { day, month, year };
    }
  } catch {}
  return null;
}

/** Tabular ("Kuwaiti") Islamic calendar: arithmetic, no data tables. Can
 * differ from the sighted/Umm al-Qura date by a day near month boundaries. */
function tabular(date: Date): HijriDate {
  let y = date.getFullYear();
  let m = date.getMonth() + 1;
  const d = date.getDate();
  if (m < 3) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524;

  const iyear = 10631 / 30;
  const shift = 8.01 / 60;
  let z = jd - 1948084;
  const cyc = Math.floor(z / 10631);
  z -= 10631 * cyc;
  const j = Math.floor((z - shift) / iyear);
  const year = 30 * cyc + j;
  z -= Math.floor(j * iyear + shift);
  let month = Math.floor((z + 28.5001) / 29.5);
  if (month === 13) month = 12;
  const day = z - Math.floor(29.5001 * month - 29);
  return { day, month, year };
}

/** e.g. "29 Rabi al Akhir 1448 AH" */
export function formatHijriDate(date: Date = new Date()): string {
  const h = fromIntl(date) ?? tabular(date);
  return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} AH`;
}
