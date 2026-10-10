import { describe, it, expect, vi } from 'vitest'
import { useDataTable } from './useDataTable'

describe('useDataTable', () => {
  it('should reflect updates from core frontendSource in rows', () => {
    const initialData = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]

    const mockState = { rows: [...initialData] }

    const frontendSource = {
      getSnapshot: vi.fn(() => mockState),
      subscribe: vi.fn((cb) => ({
        unsubscribe: vi.fn(),
      })),
      addRows: vi.fn((newRows) => {
        mockState.rows.push(...newRows)
      }),
    }

    const result = useDataTable({ data: initialData, frontendSource })

    expect(result.rows.value).toHaveLength(2)
    expect(result.rows.value[0].id).toBe(1)

    // Эмулируем операцию в ядре (добавление строки)
    frontendSource.addRows([{ id: 3, name: 'Charlie' }])

    expect(result.rows.value).toHaveLength(3)
    expect(result.rows.value[2].id).toBe(3)
  })

  it('should handle empty data gracefully', () => {
    const props = { data: [], columns: [] }
    const result = useDataTable(props)

    expect(Array.isArray(result.rows.value)).toBe(true)
    expect(result.rows.value).toEqual([])
    expect(result.filters).toEqual([])
  })
})
