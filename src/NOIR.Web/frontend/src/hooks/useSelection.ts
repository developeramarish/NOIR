import { useState, useMemo } from 'react'

export const useSelection = <T extends { id: string }>(items: T[] | undefined) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const handleSelectAll = () => {
    if (items) {
      setSelectedIds(new Set(items.map(i => i.id)))
    }
  }

  const handleSelectNone = () => setSelectedIds(new Set())

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const isAllSelected = useMemo(
    () => !!(items?.length && items.length > 0 && items.every(i => selectedIds.has(i.id))),
    [items, selectedIds]
  )

  return { selectedIds, setSelectedIds, handleSelectAll, handleSelectNone, handleToggleSelect, isAllSelected }
}
