import { minutesSinceMidnight } from "@/lib/datetime/calendar-tz";

const LOCAL_TIME_RE = /T(\d{2}):(\d{2})/;

export function formatAgendaHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function agendaHoursOutOfRangeMessage(
  startHour: number,
  endHour: number,
): string {
  return `Este horário está fora do intervalo configurado da agenda (${formatAgendaHourLabel(startHour)} às ${formatAgendaHourLabel(endHour)}).`;
}

export function isMinutesWithinAgendaHours(
  minutes: number,
  startHour: number,
  endHour: number,
): boolean {
  return minutes >= startHour * 60 && minutes <= endHour * 60;
}

/** `datetime-local` (YYYY-MM-DDTHH:mm) no fuso da agenda. */
export function isLocalDatetimeWithinAgendaHours(
  localDatetime: string,
  startHour: number,
  endHour: number,
): boolean {
  const match = LOCAL_TIME_RE.exec(localDatetime);
  if (!match) return false;
  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
  return isMinutesWithinAgendaHours(hour * 60 + minute, startHour, endHour);
}

export function isIsoWithinAgendaHours(
  isoUtc: string,
  timeZone: string,
  startHour: number,
  endHour: number,
): boolean {
  return isMinutesWithinAgendaHours(
    minutesSinceMidnight(isoUtc, timeZone),
    startHour,
    endHour,
  );
}
