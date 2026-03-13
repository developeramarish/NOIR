import type { Meta, StoryObj } from 'storybook'
import { useMemo, useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { DataTable } from './DataTable'
import { DataTableColumnHeader } from './DataTableColumnHeader'
import { DataTablePagination } from './DataTablePagination'
import { DataTableToolbar } from './DataTableToolbar'
import { useEnterpriseTable, useSelectedIds } from '@/hooks/useEnterpriseTable'
import { createSelectColumn, createActionsColumn } from '@/lib/table/columnHelpers'
import { exportTableToCSV, exportTableToExcel } from '@/lib/table/tableExport'
import { Badge } from '../badge/Badge'
import { DropdownMenuItem } from '../dropdown-menu/DropdownMenu'

// ─── Story data ────────────────────────────────────────────────────────────────

interface InvoiceRow {
  id: string
  invoice: string
  status: 'Paid' | 'Pending' | 'Unpaid'
  method: string
  amount: number
}

const INVOICES: InvoiceRow[] = Array.from({ length: 20 }, (_, i) => ({
  id: String(i + 1),
  invoice: `INV-${String(i + 1).padStart(3, '0')}`,
  status: (['Paid', 'Pending', 'Unpaid'] as const)[i % 3],
  method: ['Credit Card', 'PayPal', 'Bank Transfer'][i % 3],
  amount: (i + 1) * 50,
}))

const STATUS_COLOR: Record<InvoiceRow['status'], string> = {
  Paid: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  Unpaid: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
}

// ─── Story component ────────────────────────────────────────────────────────────

const ch = createColumnHelper<InvoiceRow>()

const getColumns = (): ColumnDef<InvoiceRow, unknown>[] => [
  createActionsColumn<InvoiceRow>(() => (
    <>
      <DropdownMenuItem className="cursor-pointer">View</DropdownMenuItem>
      <DropdownMenuItem className="cursor-pointer">Edit</DropdownMenuItem>
    </>
  )),
  createSelectColumn<InvoiceRow>(),
  ch.accessor('invoice', {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice" />,
    cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
    size: 130,
  }) as ColumnDef<InvoiceRow, unknown>,
  ch.accessor('status', {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ getValue }) => (
      <Badge variant="outline" className={STATUS_COLOR[getValue()]}>
        {getValue()}
      </Badge>
    ),
    size: 110,
  }) as ColumnDef<InvoiceRow, unknown>,
  ch.accessor('method', {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Method" />,
    enableSorting: false,
    size: 160,
  }) as ColumnDef<InvoiceRow, unknown>,
  ch.accessor('amount', {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    cell: ({ getValue }) => (
      <span className="tabular-nums">{`$${getValue().toFixed(2)}`}</span>
    ),
    meta: { align: 'right' },
    size: 110,
  }) as ColumnDef<InvoiceRow, unknown>,
]

// ─── Controlled demo wrapper ────────────────────────────────────────────────────

const DataTableDemo = ({
  isLoading = false,
  isEmpty = false,
}: {
  isLoading?: boolean
  isEmpty?: boolean
}) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [searchInput, setSearchInput] = useState('')

  const columns = useMemo(getColumns, [])

  const displayedRows = isEmpty ? [] : INVOICES

  const { table, settings, isCustomized, resetToDefault, setDensity } = useEnterpriseTable({
    data: displayedRows,
    columns,
    tableKey: 'storybook-default',
    rowCount: isEmpty ? 0 : INVOICES.length,
    state: {
      pagination: { pageIndex, pageSize },
      sorting,
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function'
        ? updater({ pageIndex, pageSize })
        : updater
      setPageIndex(next.pageIndex)
      setPageSize(next.pageSize)
    },
    onSortingChange: setSorting,
    enableRowSelection: true,
    getRowId: (row) => row.id,
  })

  const selectedIds = useSelectedIds(table.getState().rowSelection)

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search invoices…"
        hasActiveFilters={searchInput.length > 0}
        onResetFilters={() => setSearchInput('')}
        columnOrder={settings.columnOrder}
        onColumnsReorder={(newOrder) => table.setColumnOrder(newOrder)}
        isCustomized={isCustomized}
        onResetSettings={resetToDefault}
        density={settings.density}
        onDensityChange={setDensity}
      />

      {selectedIds.length > 0 && (
        <div className="rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">
          {selectedIds.length} row(s) selected
        </div>
      )}

      <DataTable
        table={table}
        density={settings.density}
        isLoading={isLoading}
        onRowClick={(row) => alert(`Clicked: ${row.invoice}`)}
      />

      <DataTablePagination table={table} />
    </div>
  )
}

// ─── Meta ────────────────────────────────────────────────────────────────────────

const meta = {
  title: 'UIKit/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof DataTable>

export default meta
type Story = StoryObj<typeof meta>

// ─── Stories ─────────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => <DataTableDemo />,
}

export const Loading: Story = {
  render: () => <DataTableDemo isLoading />,
}

export const Empty: Story = {
  render: () => <DataTableDemo isEmpty />,
}

// ─── Enterprise demo wrapper ────────────────────────────────────────────────────

const ch2 = createColumnHelper<InvoiceRow>()

const getEnterpriseColumns = (): ColumnDef<InvoiceRow, unknown>[] => [
  createActionsColumn<InvoiceRow>(() => (
    <>
      <DropdownMenuItem className="cursor-pointer">View</DropdownMenuItem>
      <DropdownMenuItem className="cursor-pointer">Edit</DropdownMenuItem>
    </>
  )),
  createSelectColumn<InvoiceRow>(),
  ch2.accessor('invoice', {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice" />,
    cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
    meta: { label: 'Invoice' },
    size: 130,
  }) as ColumnDef<InvoiceRow, unknown>,
  ch2.accessor('status', {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ getValue }) => (
      <Badge variant="outline" className={STATUS_COLOR[getValue()]}>
        {getValue()}
      </Badge>
    ),
    aggregationFn: 'count',
    aggregatedCell: ({ getValue }) => (
      <span className="text-xs">{getValue<number>()} items</span>
    ),
    meta: { label: 'Status' },
    size: 110,
  }) as ColumnDef<InvoiceRow, unknown>,
  ch2.accessor('method', {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Method" />,
    aggregationFn: 'count',
    aggregatedCell: ({ getValue }) => (
      <span className="text-xs">{getValue<number>()} items</span>
    ),
    meta: { label: 'Method' },
    size: 160,
  }) as ColumnDef<InvoiceRow, unknown>,
  ch2.accessor('amount', {
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    cell: ({ getValue }) => (
      <span className="tabular-nums">{`$${getValue().toFixed(2)}`}</span>
    ),
    aggregationFn: 'sum',
    aggregatedCell: ({ getValue }) => (
      <span className="tabular-nums font-medium">{`$${getValue<number>().toFixed(2)}`}</span>
    ),
    meta: { label: 'Amount', align: 'right' },
    size: 110,
  }) as ColumnDef<InvoiceRow, unknown>,
]

const EnterpriseDataTableDemo = () => {
  const [searchInput, setSearchInput] = useState('')
  const columns = useMemo(getEnterpriseColumns, [])

  const { table, settings, isCustomized, resetToDefault, setDensity, setGrouping } =
    useEnterpriseTable({
      data: INVOICES,
      columns,
      tableKey: 'storybook-invoices',
      enablePinning: true,
      enableResizing: true,
      enableGrouping: true,
      enableRowSelection: true,
      manualPagination: false,
      manualSorting: false,
      manualFiltering: false,
    })

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search invoices…"
        hasActiveFilters={searchInput.length > 0}
        onResetFilters={() => setSearchInput('')}
        columnOrder={settings.columnOrder}
        onColumnsReorder={(newOrder) => {
          table.setColumnOrder(newOrder)
        }}
        isCustomized={isCustomized}
        onResetSettings={resetToDefault}
        density={settings.density}
        onDensityChange={setDensity}
        onExportCSV={() => exportTableToCSV(table, { filename: 'invoices' })}
        onExportExcel={() => exportTableToExcel(table, { filename: 'invoices' })}
        groupableColumnIds={['status', 'method']}
        grouping={settings.grouping}
        onGroupingChange={setGrouping}
      />

      <DataTable
        table={table}
        density={settings.density}
        emptyState={
          <div className="py-8 text-center text-sm text-muted-foreground">No invoices found</div>
        }
      />

      <DataTablePagination table={table} />
    </div>
  )
}

export const Enterprise: Story = {
  render: () => <EnterpriseDataTableDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Enterprise-grade DataTable with column pinning, resizing, drag-to-reorder, density toggle, CSV/Excel export, and Group By — all settings persisted to localStorage.',
      },
    },
  },
}
