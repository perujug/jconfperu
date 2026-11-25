export const ROSTER_PAGE_SIZE = 50;

export function rosterWindow(total: number, requested: number, pageSize = ROSTER_PAGE_SIZE) {
  const safeTotal = Math.max(0, Math.trunc(total) || 0);
  const pages = Math.max(1, Math.ceil(safeTotal / pageSize));
  const raw = Number.isFinite(requested) ? Math.trunc(requested) : 1;
  const page = Math.min(pages, Math.max(1, raw));
  if (safeTotal === 0) return { page: 1, pages: 1, start: 0, end: 0 };
  const start = (page - 1) * pageSize;
  return { page, pages, start: start + 1, end: Math.min(safeTotal, start + pageSize) };
}
