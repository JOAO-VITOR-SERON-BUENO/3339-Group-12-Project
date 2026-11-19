// Pure helpers behind DataTable.vue: reading cell values, client-side sorting, and pagination.
// Kept free of Vue so they can be unit tested directly (see dataTableUtils.test.js).

// Read a value from a row by key; dotted keys reach into nested objects ('address.city').
export function getValue(row, key) {
  return String(key)
    .split('.')
    .reduce((value, part) => (value == null ? undefined : value[part]), row)
}

// The value a column sorts by: its sortValue(row) if given, otherwise the raw field.
// Sorting never uses render(), so dates sort by their real value, not their display text.
export function sortValueOf(row, column) {
  return column.sortValue ? column.sortValue(row) : getValue(row, column.key)
}

// Compare two cell values ascending. Empty values (null, undefined, '') always sort last.
export function compareValues(a, b) {
  const aEmpty = a == null || a === ''
  const bEmpty = b == null || b === ''
  if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a instanceof Date && b instanceof Date) return a - b
  // numeric: true sorts "Workshop 2" before "Workshop 10"; base sensitivity ignores case
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

// Return a sorted copy of rows ('asc' | 'desc'); any other direction keeps the original order.
// Equal values keep their original relative order (Array.prototype.sort is stable).
export function sortRows(rows, column, direction) {
  if (!column || (direction !== 'asc' && direction !== 'desc')) return rows.slice()
  const sign = direction === 'asc' ? 1 : -1
  return rows.slice().sort((x, y) => {
    const a = sortValueOf(x, column)
    const b = sortValueOf(y, column)
    // empty values stay last in both directions
    if (a == null || a === '' || b == null || b === '') return compareValues(a, b)
    return sign * compareValues(a, b)
  })
}

// Header click cycle: unsorted -> ascending -> descending -> unsorted.
export function nextDirection(direction) {
  if (direction === 'asc') return 'desc'
  if (direction === 'desc') return null
  return 'asc'
}

// Slice one page (1-based) and describe it for the "Showing X-Y of Z" label.
export function paginate(rows, page, pageSize) {
  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, page), pageCount)
  const start = (current - 1) * pageSize
  const pageRows = rows.slice(start, start + pageSize)
  return {
    rows: pageRows,
    page: current,
    pageCount,
    total,
    from: total === 0 ? 0 : start + 1,
    to: start + pageRows.length
  }
}
