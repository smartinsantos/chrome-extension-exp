/** Where "now" comes from. Injected so tests can pin the date that "overdue" is measured against. */
export interface Clock {
  now(): Date;
  /** Today's date on the server, as `YYYY-MM-DD`. */
  todayIsoDate(): string;
}

export const CLOCK = Symbol('CLOCK');

export const systemClock: Clock = {
  now: () => new Date(),
  todayIsoDate: () => toLocalIsoDate(new Date()),
};

/** A clock frozen at noon (UTC) on the given day, for tests and seeds. */
export function createFixedClock(todayIsoDate: string): Clock {
  return {
    now: () => new Date(`${todayIsoDate}T12:00:00.000Z`),
    todayIsoDate: () => todayIsoDate,
  };
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
