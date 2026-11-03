/** Pagination follows Alchemy's bounded pages and preserves the first visible item on resize. */
export function getPagination(count: number, page: number, pageSize: number) {
  const size = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : 1;
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  const totalPages = Math.max(1, Math.ceil(safeCount / size));
  const safePage = Number.isFinite(page) ? Math.max(0, Math.min(totalPages - 1, Math.floor(page))) : 0;
  return { page: safePage, pageSize: size, totalPages };
}

export function anchorPage(oldPage: number, oldSize: number, nextSize: number, count: number) {
  return getPagination(count, Math.floor((oldPage * Math.max(1, oldSize)) / Math.max(1, nextSize)), nextSize)
    .page;
}
