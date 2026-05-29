/** Converte valores de `datetime-local` (sem offset) usando um fuso IANA explícito. */

type WallParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const LOCAL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function getWallPartsInTimeZone(utcMs: number, timeZone: string): WallParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utcMs));

  const map: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function wallPartsEqual(a: WallParts, b: WallParts): boolean {
  return (
    a.year === b.year &&
    a.month === b.month &&
    a.day === b.day &&
    a.hour === b.hour &&
    a.minute === b.minute
  );
}

function parseLocalDateTimeValue(localValue: string): WallParts | null {
  const m = LOCAL_DATETIME_RE.exec(localValue.trim());
  if (!m) return null;
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5]),
  };
}

/**
 * Interpreta `YYYY-MM-DDTHH:mm` como horário civil no fuso informado e devolve ISO UTC.
 * Evita `new Date(local)` que usa o fuso do dispositivo/navegador.
 */
export function localDateTimeInTimeZoneToUtcIso(
  localValue: string,
  timeZone: string,
): string | null {
  const target = parseLocalDateTimeValue(localValue);
  if (!target) return null;

  const guess = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute,
  );

  for (let offsetHours = -16; offsetHours <= 16; offsetHours++) {
    const candidate = guess + offsetHours * 3600_000;
    if (wallPartsEqual(getWallPartsInTimeZone(candidate, timeZone), target)) {
      return new Date(candidate).toISOString();
    }
  }

  for (let step = -48 * 4; step <= 48 * 4; step++) {
    const candidate = guess + step * 15 * 60_000;
    if (wallPartsEqual(getWallPartsInTimeZone(candidate, timeZone), target)) {
      return new Date(candidate).toISOString();
    }
  }

  return null;
}
