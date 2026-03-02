import { renderHook, act } from '@testing-library/react'
import { useSelection } from './useSelection'

const mockItems = [
  { id: '1', name: 'Item 1' },
  { id: '2', name: 'Item 2' },
  { id: '3', name: 'Item 3' },
]

describe('useSelection', () => {
  it('starts with empty selection', () => {
    const { result } = renderHook(() => useSelection(mockItems))
    expect(result.current.selectedIds.size).toBe(0)
    expect(result.current.isAllSelected).toBe(false)
  })

  it('selects all items with handleSelectAll', () => {
    const { result } = renderHook(() => useSelection(mockItems))
    act(() => {
      result.current.handleSelectAll()
    })
    expect(result.current.selectedIds.size).toBe(3)
    expect(result.current.selectedIds.has('1')).toBe(true)
    expect(result.current.selectedIds.has('2')).toBe(true)
    expect(result.current.selectedIds.has('3')).toBe(true)
  })

  it('clears selection with handleSelectNone', () => {
    const { result } = renderHook(() => useSelection(mockItems))
    act(() => {
      result.current.handleSelectAll()
    })
    expect(result.current.selectedIds.size).toBe(3)
    act(() => {
      result.current.handleSelectNone()
    })
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('toggles individual item selection (add)', () => {
    const { result } = renderHook(() => useSelection(mockItems))
    act(() => {
      result.current.handleToggleSelect('1')
    })
    expect(result.current.selectedIds.has('1')).toBe(true)
    expect(result.current.selectedIds.size).toBe(1)
  })

  it('toggles individual item selection (remove)', () => {
    const { result } = renderHook(() => useSelection(mockItems))
    act(() => {
      result.current.handleToggleSelect('1')
    })
    act(() => {
      result.current.handleToggleSelect('1')
    })
    expect(result.current.selectedIds.has('1')).toBe(false)
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('isAllSelected is true when all items are selected', () => {
    const { result } = renderHook(() => useSelection(mockItems))
    act(() => {
      result.current.handleSelectAll()
    })
    expect(result.current.isAllSelected).toBe(true)
  })

  it('isAllSelected is false when not all items are selected', () => {
    const { result } = renderHook(() => useSelection(mockItems))
    act(() => {
      result.current.handleToggleSelect('1')
    })
    expect(result.current.isAllSelected).toBe(false)
  })

  it('isAllSelected is false for empty items array', () => {
    const { result } = renderHook(() => useSelection([]))
    expect(result.current.isAllSelected).toBe(false)
  })

  it('handles undefined items', () => {
    const { result } = renderHook(() => useSelection(undefined))
    expect(result.current.selectedIds.size).toBe(0)
    expect(result.current.isAllSelected).toBe(false)
    // handleSelectAll should not throw with undefined items
    act(() => {
      result.current.handleSelectAll()
    })
    expect(result.current.selectedIds.size).toBe(0)
  })

  it('allows setting selection directly via setSelectedIds', () => {
    const { result } = renderHook(() => useSelection(mockItems))
    act(() => {
      result.current.setSelectedIds(new Set(['2', '3']))
    })
    expect(result.current.selectedIds.size).toBe(2)
    expect(result.current.selectedIds.has('2')).toBe(true)
    expect(result.current.selectedIds.has('3')).toBe(true)
  })
})
