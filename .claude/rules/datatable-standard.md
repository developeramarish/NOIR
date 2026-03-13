# DataTable Standard (TanStack Table)

## MANDATORY: Use DataTable for List Pages

All **table list pages** (paginated entity lists) MUST use TanStack Table via:
- `DataTable` + `DataTableToolbar` + `DataTablePagination` from `@uikit`
- `useServerTable` + `useTableParams` from `@/hooks`
- `createColumnHelper` from `@tanstack/react-table`

Do NOT use custom tables with `ColumnVisibilityDropdown` + `useColumnVisibility` — column visibility is driven by column definitions. See `.claude/rules/datatable-migration.md` for migration checklist.

## Column Order

1. **Actions column FIRST** (leftmost) — `createActionsColumn()` from `@/lib/table/columnHelpers`
2. **Select column SECOND** (when enabled) — `createSelectColumn()`
3. **Data columns** follow

```tsx
const columns = useMemo((): ColumnDef<T, unknown>[] => [
  createActionsColumn<T>((row) => ( /* menu items */ )),
  createSelectColumn<T>(),  // only if enableRowSelection
  ch.accessor('name', { ... }),
  // ...data columns
], [deps])
```

## Actions Column Properties

- **Icon**: `EllipsisVertical` (vertical `⋮`), NOT `MoreHorizontal`
- **Position**: First column, sticky left (`meta: { sticky: 'left' }`)
- **Dropdown alignment**: `align="start"` (opens rightward)
- **Size**: **44px FIXED** — must set `size: 44, minSize: 44, maxSize: 44` to prevent resizing
- **Properties**: non-sortable, non-hideable

## Select Column Properties

- **Size**: **40px FIXED** — must set `size: 40, minSize: 40, maxSize: 40`
- **Position**: Second column (after actions)
- **Properties**: non-sortable, non-hideable

## Fixed Width Columns

DataTable automatically enforces fixed width for columns where `minSize === maxSize`. The implementation uses a `<colgroup>` with explicit widths:

- **Fixed columns**: `width: Npx` (exact pixel width)
- **Flexible columns**: `width: 100%` (absorb remaining space)

This ensures fixed columns (actions at 44px, select at 40px) maintain their exact widths while flexible columns share the remaining table width equally.

**Implementation details**:
1. `DataTable` renders a `<colgroup>` with `<col>` elements for each column
2. Fixed columns (`minSize === maxSize`) get explicit pixel widths
3. Flexible columns get `width: 100%` to distribute remaining space
4. The underlying `<table>` uses `table-layout: fixed` (via `Table.tsx`)

**Creating fixed-width columns**:
```tsx
// Actions column - 44px fixed
createActionsColumn<T>((row) => (...))  // Already configured: size: 44, minSize: 44, maxSize: 44

// Select column - 40px fixed
createSelectColumn<T>()  // Already configured: size: 40, minSize: 40, maxSize: 40

// Custom fixed column
{
  accessorKey: 'status',
  size: 120,
  minSize: 120,
  maxSize: 120,  // minSize === maxSize makes it fixed
}
```

## Sticky Columns

Use `meta: { sticky: 'left' }` on column definitions. `DataTable.tsx` auto-applies `sticky left-0 z-10 bg-background` to both `<th>` and `<td>`.

## Column Visibility

- Use `columnVisibilityStorageKey` in `useServerTable()` for localStorage persistence
- Pass `onResetColumnVisibility={table.resetColumnVisibility}` to `DataTableToolbar`
- Storage key format: `noir:col-vis:{page-name}` (e.g. `'customers'`, `'orders'`)
- Pages with few columns: set `showColumnToggle={false}`
- Every column MUST have `meta: { label: t('...') }` for the Columns dropdown

## Image Columns

For columns displaying thumbnails/photos, use `FilePreviewTrigger` per `.claude/rules/image-preview-in-lists.md`:
```tsx
cell: ({ row }) => row.original.imageUrl ? (
  <FilePreviewTrigger file={{ url: row.original.imageUrl, name: row.original.name }} thumbnailWidth={48} thumbnailHeight={48} />
) : null
```

## Empty State

DataTable MUST receive an `emptyState` prop with `<EmptyState icon={...} title={...} description={...} />` — never plain text. UI audit `empty-state` rule enforces this.

## TypeScript: Filter Values

`useTableParams<{ role?: string }>()` returns `params` where filter values live in `params.filters`, not at top level. Use `params.filters.role` (not `params.role`) in Select components.

## Accessibility

- All icon-only action buttons: `aria-label={t('...')}` or contextual label (e.g. `aria-label={t('labels.actions', 'Actions')}`)
- All interactive elements: `cursor-pointer` (Tabs, Checkbox, Select, Switch, etc.)

## Bug Prevention

- **`useTransition`-wrapped filter callbacks**: If a filter button shows active count, track count locally (not from deferred prop). The prop updates are delayed by `startFilterTransition`.
- **Credenza stableChildrenRef**: Credenza freezes children when `open` becomes `false` (close animation). If a trigger button inside Credenza updates local state AND closes the dialog simultaneously, the button renders stale content. **Fix**: Place trigger buttons OUTSIDE `<Credenza>` with `onClick={() => setOpen(true)}` instead of using `<CredenzaTrigger>`. See `AttributeFilterDialog.tsx`.

## Reference Implementations

- **Gold standard**: `UsersPage.tsx`, `CustomersPage.tsx`, `OrdersPage.tsx`
- **With filters**: `PromotionsPage.tsx`, `UsersPage.tsx`
- **With row selection**: `ReviewsPage.tsx`, `BlogPostsPage.tsx`, `CustomersPage.tsx`
- **Storybook**: `Storybook > DataTable` — full example with actions, select, toolbar, pagination
