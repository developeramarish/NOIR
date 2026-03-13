import { flexRender, type Table, type RowData } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../table/Table'
import { Skeleton } from '../skeleton/Skeleton'
import { EmptyState } from '../empty-state/EmptyState'

interface DataTableProps<TData extends RowData> {
  table: Table<TData>
  /** Show loading skeletons */
  isLoading?: boolean
  /**
   * Show stale/pending visual (opacity dimming).
   * Pass `isPlaceholderData || isFilterPending || isSearchStale`.
   */
  isStale?: boolean
  /** Custom empty state — defaults to built-in EmptyState */
  emptyState?: React.ReactNode
  /** Called when user clicks a non-action row cell */
  onRowClick?: (row: TData) => void
  /**
   * Number of skeleton rows to show during loading.
   * Defaults to 5.
   */
  skeletonRowCount?: number
  className?: string
}

/**
 * Headless DataTable renderer that composes the existing UIKit Table primitives.
 * Integrates with useServerTable + useTableParams hooks.
 *
 * Performance notes:
 * - Column resizing uses CSS variable technique (zero React re-renders during drag)
 * - Row selection reads from table.getState().rowSelection — don't call getFilteredSelectedRowModel()
 *   for bulk action counts (use useSelectedIds hook from useServerTable instead)
 */
export const DataTable = <TData extends RowData>({
  table,
  isLoading = false,
  isStale = false,
  emptyState,
  onRowClick,
  skeletonRowCount = 5,
  className,
}: DataTableProps<TData>) => {
  const columns = table.getAllColumns()
  const visibleColumnCount = table.getVisibleLeafColumns().length

  // CSS variable technique for column sizing
  const columnSizeVars = Object.fromEntries(
    columns.map((col) => {
      const minSize = col.columnDef.minSize
      const maxSize = col.columnDef.maxSize
      const isFixed = minSize !== undefined && maxSize !== undefined && minSize === maxSize

      if (isFixed) {
        // Fixed columns: explicit pixel width
        return [`--col-${col.id}-size`, `${minSize}px`]
      } else {
        // Flexible columns: use defined size or auto
        const definedSize = col.columnDef.size
        const size = definedSize ?? col.getSize()
        return [`--col-${col.id}-size`, size ? `${size}px` : 'auto']
      }
    }),
  ) as React.CSSProperties

  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 overflow-hidden transition-opacity duration-150',
        isStale && 'opacity-60 pointer-events-none',
        className,
      )}
    >
      <UITable style={columnSizeVars}>
        {/* Colgroup ensures fixed column widths are respected in table-layout: fixed */}
        <colgroup>
          {table.getAllLeafColumns().map((column) => {
            const minSize = column.columnDef.minSize
            const maxSize = column.columnDef.maxSize
            const isFixed = minSize !== undefined && maxSize !== undefined && minSize === maxSize

            return (
              <col
                key={column.id}
                style={{
                  width: isFixed ? `${minSize}px` : '100%',
                  minWidth: isFixed ? `${minSize}px` : undefined,
                  maxWidth: isFixed ? `${maxSize}px` : undefined,
                }}
              />
            )
          })}
        </colgroup>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const isSticky = header.column.columnDef.meta?.sticky === 'left'
                const minSize = header.column.columnDef.minSize
                const maxSize = header.column.columnDef.maxSize
                const isFixed = minSize !== undefined && maxSize !== undefined && minSize === maxSize

                return (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      header.column.columnDef.meta?.headerClassName,
                      isSticky && 'sticky left-0 z-10 bg-background',
                      isFixed && 'w-[var(--col-fixed-size)]',
                    )}
                    style={{
                      width: isFixed ? `${minSize}px` : `var(--col-${header.column.id}-size)`,
                      minWidth: isFixed ? `${minSize}px` : `var(--col-${header.column.id}-min-size, auto)`,
                      maxWidth: isFixed ? `${maxSize}px` : `var(--col-${header.column.id}-max-size, auto)`,
                      // For fixed columns, also set a CSS variable for potential Tailwind use
                      ...(isFixed && { '--col-fixed-size': `${minSize}px` } as React.CSSProperties),
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {isLoading ? (
            // Skeleton rows
            Array.from({ length: skeletonRowCount }).map((_, i) => (
              <TableRow key={`skeleton-${i}`} className="hover:bg-transparent">
                {Array.from({ length: visibleColumnCount }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows.length === 0 ? (
            // Empty state
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={visibleColumnCount} className="py-12 text-center">
                {emptyState ?? (
                  <EmptyState
                    title="No results"
                    description="Try adjusting your search or filters."
                  />
                )}
              </TableCell>
            </TableRow>
          ) : (
            // Data rows
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? 'selected' : undefined}
                onClick={
                  onRowClick
                    ? (e) => {
                        // Don't trigger row click when clicking interactive elements (checkboxes, buttons, links)
                        const target = e.target as HTMLElement
                        if (
                          target.closest('button, a, input, [role="checkbox"], [role="menuitem"]')
                        ) {
                          return
                        }
                        onRowClick(row.original)
                      }
                    : undefined
                }
                className={cn(onRowClick && 'cursor-pointer')}
              >
                {row.getVisibleCells().map((cell) => {
                  const isSticky = cell.column.columnDef.meta?.sticky === 'left'
                  const minSize = cell.column.columnDef.minSize
                  const maxSize = cell.column.columnDef.maxSize
                  const isFixed = minSize !== undefined && maxSize !== undefined && minSize === maxSize

                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        cell.column.columnDef.meta?.cellClassName,
                        cell.column.columnDef.meta?.align === 'center' && 'text-center',
                        cell.column.columnDef.meta?.align === 'right' && 'text-right',
                        isSticky && 'sticky left-0 z-10 bg-background',
                      )}
                      style={{
                        width: isFixed ? `${minSize}px` : `var(--col-${cell.column.id}-size)`,
                        minWidth: isFixed ? `${minSize}px` : `var(--col-${cell.column.id}-min-size, auto)`,
                        maxWidth: isFixed ? `${maxSize}px` : `var(--col-${cell.column.id}-max-size, auto)`,
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </UITable>
    </div>
  )
}

export type { DataTableProps }
