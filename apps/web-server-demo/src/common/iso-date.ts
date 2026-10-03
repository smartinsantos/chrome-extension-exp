const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** True only for real calendar dates written as `YYYY-MM-DD` (so `2026-02-30` is rejected). */
export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (match === null) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const shifted = new Date(Date.parse(`${isoDate}T00:00:00.000Z`) + days * MILLISECONDS_PER_DAY);
  return shifted.toISOString().slice(0, 10);
}
