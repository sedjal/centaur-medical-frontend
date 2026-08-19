/** Parse API / DB date-only values without timezone shift (YYYY-MM-DD). */
export function formatDateOnly(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // pg/knex may return DATE as local midnight — use local calendar parts
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const fallback = String(value).trim();
  const match = fallback.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : fallback.slice(0, 10);
}

/** Today's calendar date in local timezone (for `<input type="date">`). */
export function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Display as DD/MM/YYYY for French UI (from safe YYYY-MM-DD parsing). */
export function formatDateFr(value: unknown): string {
  const iso = formatDateOnly(value);
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
