const dateOpts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-IN', dateOpts) : '—');
export const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString('en-IN', timeOpts) : '—');
export const fmtDateTime = (iso?: string) => (iso ? `${fmtDate(iso)}, ${fmtTime(iso)}` : '—');

export function minutesLeft(expiresAt?: string, nowMs: number = Date.now()): number {
  if (!expiresAt) return 0;
  return Math.round((new Date(expiresAt).getTime() - nowMs) / 60000);
}

export function fmtDuration(mins: number): string {
  const m = Math.abs(mins);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
