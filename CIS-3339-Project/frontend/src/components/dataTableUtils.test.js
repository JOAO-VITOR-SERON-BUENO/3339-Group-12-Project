import { describe, it, expect } from 'vitest'
import { getValue, compareValues, sortRows, nextDirection, paginate } from './dataTableUtils'

// 15 rows, like the seeded lists
const rows = Array.from({ length: 15 }, (_, i) => ({
  _id: String(i + 1),
  name: `Workshop ${i + 1}`,
  address: { city: i % 2 ? 'Houston' : 'Pasadena' }
}))
const nameColumn = { label: 'Name', key: 'name' }

describe('DataTable helpers', () => {
  it('reads nested fields with dotted keys', () => {
    expect(getValue(rows[0], 'address.city')).toBe('Pasadena')
    expect(getValue({}, 'address.city')).toBeUndefined()
  })

  it('cycles header clicks: ascending, descending, unsorted', () => {
    expect(nextDirection(null)).toBe('asc')
    expect(nextDirection('asc')).toBe('desc')
    expect(nextDirection('desc')).toBe(null)
  })

  it('sorts ascending and descending with natural number order, and restores the original order', () => {
    const asc = sortRows(rows, nameColumn, 'asc').map((r) => r.name)
    expect(asc.slice(0, 3)).toEqual(['Workshop 1', 'Workshop 2', 'Workshop 3'])
    expect(asc[14]).toBe('Workshop 15')

    const desc = sortRows(rows, nameColumn, 'desc').map((r) => r.name)
    expect(desc[0]).toBe('Workshop 15')

    expect(sortRows(rows, nameColumn, null)).toEqual(rows)
    expect(sortRows(rows, nameColumn, 'asc')).not.toBe(rows) // never mutates the input
  })

  it('sorts by sortValue instead of the displayed text', () => {
    const dated = [
      { _id: 'a', date: '2026-12-01T00:00:00.000Z' },
      { _id: 'b', date: '2026-02-15T00:00:00.000Z' }
    ]
    const column = { key: 'date', render: (r) => r.date.slice(5, 10), sortValue: (r) => new Date(r.date) }
    expect(sortRows(dated, column, 'asc').map((r) => r._id)).toEqual(['b', 'a'])
  })

  it('keeps empty values last in both directions', () => {
    const withEmpty = [{ v: 'b' }, { v: '' }, { v: 'a' }, { v: null }]
    const column = { key: 'v' }
    expect(sortRows(withEmpty, column, 'asc').map((r) => r.v)).toEqual(['a', 'b', '', null])
    expect(sortRows(withEmpty, column, 'desc').map((r) => r.v)).toEqual(['b', 'a', '', null])
    expect(compareValues('a', 'A')).toBe(0)
  })

  it('paginates 15 rows into pages of 10 with a "Showing X-Y of Z" range', () => {
    expect(paginate(rows, 1, 10)).toMatchObject({ page: 1, pageCount: 2, from: 1, to: 10, total: 15 })
    const second = paginate(rows, 2, 10)
    expect(second).toMatchObject({ page: 2, from: 11, to: 15 })
    expect(second.rows.map((r) => r._id)).toEqual(['11', '12', '13', '14', '15'])
  })

  it('clamps out-of-range pages, so fewer results never leave a stale page', () => {
    // e.g. on page 2 of 15 rows, then a search returns 3 rows
    expect(paginate(rows.slice(0, 3), 2, 10)).toMatchObject({ page: 1, from: 1, to: 3, total: 3 })
    expect(paginate([], 1, 10)).toMatchObject({ page: 1, pageCount: 1, from: 0, to: 0, total: 0, rows: [] })
  })
})
