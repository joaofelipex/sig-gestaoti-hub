/** Evento all-day para exportação iCalendar (.ics). */
export interface IcsEvent {
  /** Identificador estável (UID). */
  uid: string;
  /** Título do evento. */
  summary: string;
  /** Data YYYY-MM-DD (all-day). */
  date: string;
  description?: string;
  location?: string;
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join('\r\n');
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Converte YYYY-MM-DD em YYYYMMDD; retorna null se inválido. */
export function toIcsDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return `${m[1]}${m[2]}${m[3]}`;
}

/** Soma um dia em YYYYMMDD (fim exclusivo de evento all-day). */
function nextDayYyyymmdd(yyyymmdd: string): string {
  const y = Number(yyyymmdd.slice(0, 4));
  const mo = Number(yyyymmdd.slice(4, 6)) - 1;
  const d = Number(yyyymmdd.slice(6, 8));
  const dt = new Date(Date.UTC(y, mo, d + 1));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

function stampNow(): string {
  const n = new Date();
  const p = (v: number) => String(v).padStart(2, '0');
  return (
    `${n.getUTCFullYear()}${p(n.getUTCMonth() + 1)}${p(n.getUTCDate())}` +
    `T${p(n.getUTCHours())}${p(n.getUTCMinutes())}${p(n.getUTCSeconds())}Z`
  );
}

export function buildIcsCalendar(events: IcsEvent[], calendarName = 'SIG Gestão TI'): string {
  const stamp = stampNow();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//IMTS//SIG Gestao TI//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const ev of events) {
    const start = toIcsDate(ev.date);
    if (!start) continue;
    const end = nextDayYyyymmdd(start);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${escapeText(ev.uid)}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${start}`);
    lines.push(`DTEND;VALUE=DATE:${end}`);
    lines.push(`SUMMARY:${escapeText(ev.summary)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/**
 * Baixa um arquivo .ics. Retorna a quantidade de eventos incluídos (0 = nada gerado).
 */
export function exportToICS(events: IcsEvent[], filename: string, calendarName?: string): number {
  const valid = events.filter((e) => !!toIcsDate(e.date));
  if (!valid.length) return 0;
  const body = buildIcsCalendar(valid, calendarName);
  const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  a.click();
  URL.revokeObjectURL(url);
  return valid.length;
}
