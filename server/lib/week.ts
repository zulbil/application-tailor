/** ISO date (YYYY-MM-DD) of the Monday on or before `date`. */
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

/** [start, end) Date bounds of the week that `weekStart` (YYYY-MM-DD) begins. */
export function weekBounds(weekStart: string): { start: Date; end: Date } {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 7);
  return { start, end };
}
