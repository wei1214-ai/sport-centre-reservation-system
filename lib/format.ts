import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { TZDate } from "@date-fns/tz";

/** Display timezone — the centre operates on Malaysian time. */
export const DISPLAY_TIMEZONE = "Asia/Kuala_Lumpur";

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === "string" ? parseISO(value) : value;
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
}

/** Wraps an instant so date-fns getters read wall-clock time in the centre's timezone. */
export function inDisplayTz(
  value: string | Date | null | undefined,
): TZDate | null {
  const d = toDate(value);
  if (!d) return null;
  return new TZDate(d, DISPLAY_TIMEZONE);
}

function fmt(value: string | Date | null | undefined, pattern: string, fallback: string): string {
  const d = inDisplayTz(value);
  if (!d) return fallback;
  return format(d, pattern);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return fmt(value, "dd/MM/yyyy · HH:mm", "—");
}

export function formatDateOnly(value: string | Date | null | undefined): string {
  return fmt(value, "dd/MM/yyyy", "—");
}

export function formatTimeOnly(value: string | Date | null | undefined): string {
  return fmt(value, "HH:mm", "—");
}

/**
 * Malaysian phone display format, applied while typing:
 * `011-2000 1010`, `012-345 6789`, `03-2345 6789`, `082-123 456`.
 * Accepts `+60`/`60` prefixes and drops any separators the user pasted.
 */
export function formatMalaysianPhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("60")) digits = `0${digits.slice(2)}`;

  let groups: number[];
  if (digits.startsWith("011") || digits.startsWith("015")) {
    groups = [3, 4, 4];
  } else if (digits.startsWith("01")) {
    groups = [3, 3, 4];
  } else if (digits.startsWith("03")) {
    groups = [2, 4, 4];
  } else if (digits.startsWith("08")) {
    groups = [3, 3, 3];
  } else if (/^0[4-9]/.test(digits)) {
    groups = [2, 3, 4];
  } else {
    groups = [3, 4, 4];
  }

  const maxLength = groups.reduce((total, size) => total + size, 0);
  digits = digits.slice(0, maxLength);

  let formatted = "";
  let start = 0;
  for (let index = 0; index < groups.length && start < digits.length; index += 1) {
    if (index > 0) formatted += index === 1 ? "-" : " ";
    formatted += digits.slice(start, start + groups[index]);
    start += groups[index];
  }
  return formatted;
}

export function formatDayLabel(value: string | Date | null | undefined): string {
  return fmt(value, "dd/MM/yyyy", "—");
}

export function relativeFromNow(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${formatDistanceToNowStrict(d, { addSuffix: true })}`;
}

/**
 * Converts a wall-clock date + time (centre timezone) into a canonical UTC ISO
 * instant. Numeric constructor arguments are used on purpose: TZDate parses
 * plain strings with the *system* time zone, while numeric arguments are
 * interpreted as wall-clock time in the target zone.
 */
export function combineLocalDateTime(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  const tzDate = new TZDate(year, month - 1, day, hours, minutes, 0, DISPLAY_TIMEZONE);
  // Canonical UTC form for the database and further comparisons.
  return new Date(tzDate.getTime()).toISOString();
}

/** hh:mm wall-clock part (centre timezone) of an instant. */
export function localTimePart(value: string | Date): string {
  return fmt(value, "HH:mm", "");
}

/** yyyy-MM-dd wall-clock part (centre timezone) of an instant. */
export function localDatePart(value: string | Date): string {
  return fmt(value, "yyyy-MM-dd", "");
}

/** Per-session price = monthly fee / sessions per month (0-safe). */
export function perSessionPrice(monthlyFee: number, sessionsPerMonth: number): number {
  if (!sessionsPerMonth || sessionsPerMonth <= 0) return 0;
  return monthlyFee / sessionsPerMonth;
}
