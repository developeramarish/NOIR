# Admin Portal Enhancement v28 Feb

> Date: 2026-02-28. Enhancement plan for the admin portal (`/portal/*`).

---

## 1. Dashboard (Modular Widget Architecture)

**Current state**: Backend fully implemented (7 metrics, `DashboardQueryService` 244 lines, 15 tests). Frontend is a 38-line placeholder page. `recharts` installed, `useDashboardMetrics()` hook exists but unused, 34 i18n keys pre-planned.

**Route**: `/portal` (DashboardPage)

### Architecture: Widget Groups as Module Sub-Features (Option A)

Dashboard uses the **existing Feature Management system** to gate widget groups. Each widget group is a sub-feature under `ModuleNames.Dashboard.*`, toggled via `ModulesSettingsTab`.

```
ModuleNames.Dashboard.Core        // Always enabled (core module) — welcome, quick actions, activity feed
ModuleNames.Dashboard.Ecommerce   // Gated — revenue, orders, products, customers
ModuleNames.Dashboard.Blog        // Gated — post stats, comments pending
ModuleNames.Dashboard.Inventory   // Gated — stock alerts, receipt summary
// Future ERP modules:
ModuleNames.Dashboard.Crm         // Gated — leads, pipeline, contacts
ModuleNames.Dashboard.Hr          // Gated — employees, leave requests
ModuleNames.Dashboard.Pm          // Gated — projects, tasks, milestones
```

**How it works:**
1. Frontend calls `useFeatures()` to check which `Dashboard.*` sub-features are enabled
2. Each widget group is wrapped in `<FeatureGuard feature="Dashboard.Ecommerce">` (or equivalent check)
3. Disabled groups are simply not rendered — no blank spaces, grid auto-fills
4. Tenant admins toggle groups in `ModulesSettingsTab` (existing UI)
5. Platform admins see all available groups across all tenants

### Platform Admin vs Tenant Admin

| View | Platform Admin | Tenant Admin |
|------|---------------|--------------|
| **Core widgets** | System-wide stats (all tenants) | Tenant-scoped stats |
| **Module widgets** | Aggregate across tenants | Own tenant data only |
| **Toggle control** | Platform availability (`IsAvailable`) | Tenant enable (`IsEnabled`) |
| **Quick actions** | Tenant management, system health | Order fulfillment, content moderation |

### Widget Groups

#### 1.1 Core (Always On)
- Welcome card with user name, role, last login
- Quick actions (links to common admin tasks, pending item badges)
- Recent activity feed (latest orders, registrations, reviews, system events)
- System health (platform admin only — API status, job queue, error rate)

#### 1.2 Ecommerce (Gated: `Dashboard.Ecommerce`)
- Revenue overview: total revenue (today/week/month/year), period comparison (% change), revenue by payment method
- Revenue chart (line/area) — daily/weekly/monthly granularity
- Order metrics: count with status breakdown, daily trend bar chart, AOV, conversion rate
- Customer metrics: total (new vs returning), registrations trend, top customers by revenue
- Product performance: top selling (by qty and revenue), low stock alerts, dead stock, category breakdown

#### 1.3 Blog (Gated: `Dashboard.Blog`)
- Total posts (published/draft/archived)
- Comments pending moderation count
- Top posts by views
- Publishing trend chart

#### 1.4 Inventory (Gated: `Dashboard.Inventory`)
- Low stock alerts (threshold-based)
- Recent receipts (StockIn/StockOut)
- Inventory value summary
- Stock movement trend

### Backend Changes
- **Existing**: `GetDashboardMetricsQuery` aggregates 7 ecommerce metrics via `Task.WhenAll()` in `DashboardQueryService` (244 lines, 11+4 tests)
- **New**: Separate query per widget group for clean feature gating:
  - `GetCoreDashboardQuery` — activity feed, quick action counts
  - `GetEcommerceDashboardQuery` — wraps existing `DashboardQueryService`
  - `GetBlogDashboardQuery` — post/comment stats
  - `GetInventoryDashboardQuery` — stock alerts, receipt summary
- Each query checks `FeatureChecker` before executing (fail-closed: returns empty if disabled)
- Platform admin queries aggregate across tenants; tenant admin queries are tenant-scoped (automatic via Finbuckle)

### Frontend Implementation
- `recharts` already installed — use for all charts
- Responsive grid: CSS Grid with `auto-fill` / `minmax()` — auto-adjusts when groups are hidden
- Each widget group = lazy-loaded component (code-split per group)
- `useDashboardMetrics()` hook exists — extend or create per-group hooks
- 34 i18n keys already defined — extend for new widget groups

---

## 2. Media Manager

**Current state**: Excellent processing pipeline (AVIF/WebP conversion, ThumbHash, ColorAnalyzer, SrcsetGenerator). Upload logic is inline in `MediaEndpoints.cs` (not CQRS). No list/search/delete endpoints. No `/portal/media` page. 3 domain events defined (`MediaFileUploaded`, `MediaFileDeleted`, `MediaFileProcessed`) but no handlers wired.

**Proposed route**: `/portal/media`

### 2.0 Storage Provider Bug Fixes (Pre-requisite)

Three bugs prevent cloud storage providers (S3, Azure Blob) from working correctly. These MUST be fixed before building the Media Manager UI.

#### Bug 1: `GetPublicUrl()` always returns relative path
**File**: `FileStorageService.cs`
**Issue**: `GetPublicUrl()` returns `/media/{storagePath}` regardless of storage provider. When using S3/Azure, this forces all file serving through the backend as a proxy (Browser → Backend → S3 → Backend → Browser), adding latency.
**Fix**: Check if provider is cloud-based → return direct CDN/bucket URL. Fall back to relative path for local storage.

#### Bug 2: `MediaEndpoints.cs` produces malformed URLs with CDN
**File**: `MediaEndpoints.cs`
**Issue**: When `CdnBaseUrl` is configured, the endpoint blindly prepends `{host}` to URLs that are already absolute (e.g., `https://cdn.example.com`), producing `https://api.noir.local/https://cdn.example.com/...`.
**Fix**: Check if URL is already absolute before prepending host.

#### Bug 3: `CdnBaseUrl` uses filename instead of full storage path
**File**: `MediaEndpoints.cs`
**Issue**: `CdnBaseUrl` is combined with `fileName` instead of `storagePath`, losing the folder structure (e.g., `products/abc.jpg` becomes just `abc.jpg`).
**Fix**: Use `storagePath` (or the full relative path) when constructing CDN URLs.

**Effort**: ~20 lines of code across 3 files. Low risk, high impact.

### 2.1 Media Library Page
- Grid/List view toggle of all uploaded media files
- Thumbnail previews (using existing ThumbHash for progressive loading)
- Search by filename, type, date
- Filter by type (image, document, video)
- Sort by date, name, size
- Pagination with virtual scrolling for large libraries

### 2.2 Upload
- Drag-and-drop multi-file upload
- Progress indicator per file (using SSE)
- Automatic image optimization (existing `ImageProcessorService`)
- Srcset generation (existing `SrcsetGenerator`)

### 2.3 File Management
- Rename, delete files
- View file details (dimensions, size, URL, srcset URLs, ThumbHash preview)
- Copy URL to clipboard
- Bulk select and delete

### 2.4 Integration
- Reusable `MediaPickerDialog` — use from product editor, blog editor, etc.
- Replace current scattered upload components with media picker
- Track file usage (which entity references which file)

### Backend Changes
- **Refactor**: Extract upload logic from `MediaEndpoints.cs` into proper CQRS commands
  - `UploadMediaFileCommand` + Handler + Validator
  - `DeleteMediaFileCommand` + Handler
  - `RenameMediaFileCommand` + Handler + Validator
- **New queries**: `GetMediaFilesQuery` (paginated, searchable, filterable), `GetMediaFileByIdQuery`
- **Wire domain events**: `MediaFileUploaded` → handler for post-processing notifications, `MediaFileDeleted` → handler for cleanup
- **New endpoint group**: `MediaEndpoints` (list, get, delete, rename) alongside existing upload

### Frontend Implementation
- New page: `/portal/media` with `MediaLibraryPage` component
- `MediaPickerDialog` — reusable dialog for selecting media from library
- `useMediaFiles()` hook — TanStack Query for paginated media list
- Lazy loading thumbnails with ThumbHash placeholders
- Click-to-preview using existing `FilePreviewModal`

---

## 3. Global Search

**Current state**: Command palette (Cmd+K) has ~25 navigation items + recent pages. No content search. 21 of 23 list queries support `Search` parameter. `ProductFilterIndex` has `SearchText` column but no FTS index created.

### Required Features

#### 3.1 Enhanced Command Palette
- Extend existing Cmd+K with content search tab
- Search-as-you-type with 300ms debounce, minimum 2 characters
- Results grouped by type: Products, Orders, Customers, Blog Posts, Users

#### 3.2 Search Results
- Top 5 results per category
- Highlight matching text
- Click to navigate to entity detail page
- "See all results" link per category → navigates to entity list with search pre-filled

#### 3.3 Search Scope
| Entity | Search fields | Existing `Search` param |
|--------|--------------|------------------------|
| Products | Name, SKU, description | Yes |
| Orders | Order number, customer name, email | Yes |
| Customers | Name, email, phone | Yes |
| Blog Posts | Title, content excerpt | Yes |
| Users | Name, email | Yes |

### Backend Changes
- **New**: `GlobalSearchQuery` — executes parallel searches across entities via `Task.WhenAll()`
- **New endpoint**: `GET /api/search?q=keyword&types=products,orders,customers`
- Returns unified format: `{ type, id, title, subtitle, url, highlightedText }`
- Leverages existing `Search` parameters on individual queries
- Feature-gated: only search entity types whose modules are enabled

### Frontend Implementation
- Enhance existing command palette component
- Add "Search" tab alongside existing "Pages" and "Recent" tabs
- Debounce 300ms, minimum 2 characters
- Loading skeleton per category while searching

---

## 4. Import/Export UI

**Current state**: Products have full CSV import/export backend. Reports CSV export works. Excel export is a stub (enum defined, UI offers it, backend always generates CSV regardless). No Excel library installed. No import/export for Customers, Orders, Blog Posts, Inventory.

### Required Features

#### 4.1 Export
- Export button on list pages (Products, Customers, Orders)
- Format selection: CSV, Excel (XLSX)
- Column selection (choose which fields to export)
- Filter-aware (export filtered results, not all)
- Background job for large exports with SSE progress

#### 4.2 Import
- Import wizard (step-by-step):
  1. Upload file (CSV/Excel)
  2. Column mapping (map file columns to entity fields)
  3. Preview & validation (show errors before committing)
  4. Execute import with SSE progress bar
  5. Summary (success/error count, download error report)
- Duplicate detection (by SKU for products, by email for customers)
- Template download (empty CSV/Excel with correct headers)

#### 4.3 Import History
- Log of past imports (date, user, file, result counts)
- Re-download imported file

### Applicable Entities
| Entity | Export | Import | Priority |
|--------|--------|--------|----------|
| Products | Yes (exists) | Yes (exists) | High |
| Customers | Yes (new) | Yes (new) | High |
| Orders | Yes (new) | No | Medium |
| Blog Posts | Yes (new) | Yes (new) | Low |
| Inventory | Yes (new) | Yes (stock adjustments, new) | Medium |

### Backend Changes
- **Fix**: Excel export stub — install `ClosedXML` or `EPPlus`, implement actual XLSX generation
- **New commands**: `ExportCustomersCommand`, `ExportOrdersCommand`, `ImportCustomersCommand`
- Use Hangfire for background processing of large imports/exports
- Use existing SSE infrastructure for progress streaming
- Server-side validation before commit (return errors, allow user to fix)

### Frontend Implementation
- Reusable `ImportWizard` component (step-by-step flow)
- Reusable `ExportDialog` component (format + column selection)
- SheetJS (`xlsx`) library for client-side Excel parsing/preview
- SSE integration for progress updates

---

## 5. Bulk Actions Enhancement

**Current state**: Products have bulk Publish/Archive/Delete (end-to-end). Reviews have bulk Approve/Reject (end-to-end). Each page has its own selection logic — no shared `useSelection` hook or `BulkActionToolbar`. 15+ entities have no bulk operations.

### Required Improvements

#### 5.1 Shared Infrastructure
- Reusable `useSelection` hook (select all, select page, persist across pagination)
- Reusable `BulkActionToolbar` component (appears when items selected, entity-specific actions)
- Consistent checkbox column on all list pages

#### 5.2 Bulk Actions per Entity
| Entity | Bulk Actions |
|--------|-------------|
| Products | Delete, Change status (Draft/Active/Archived), Change category, Export |
| Orders | Change status, Assign to, Export, Print labels |
| Customers | Add to group, Remove from group, Export |
| Blog Posts | Publish, Unpublish, Delete, Change category |
| Reviews | Approve, Reject, Delete |
| Inventory | Adjust stock, Export |

#### 5.3 Confirmation & Progress
- Confirmation dialog with item count and action description
- Progress bar for large batch operations (SSE)
- Result summary (success/fail counts)
- Undo option where applicable

### Backend Changes
- **Refactor**: Extract existing Products/Reviews bulk logic into reusable pattern
- **New bulk commands**: `BulkUpdateOrderStatusCommand`, `BulkAddToGroupCommand`, `BulkPublishPostsCommand`
- Batch size limit: max 100 sync, background job for larger batches

### Frontend Implementation
- `useSelection<T>` hook — shared across all list pages
- `BulkActionToolbar` component — configurable actions per entity
- Migrate existing Products/Reviews bulk UI to shared components
- Add bulk operations to remaining entity list pages

---

## Priority & Dependencies

| # | Feature | Priority | Dependencies |
|---|---------|----------|--------------|
| 0 | Media Storage Bug Fixes | **Critical** | Pre-req for Media Manager |
| 1 | Dashboard (Widget Architecture) | **High** | Feature Management system (exists), recharts (installed) |
| 2 | Media Manager | **High** | Bug fixes (#0), existing upload infra |
| 3 | Global Search | **Medium** | Existing Search params on queries |
| 4 | Import/Export UI | **Medium** | Existing product import, need Excel library |
| 5 | Bulk Actions | **Low** | Existing bulk commands, need shared components |

**Recommended order**: Media Bug Fixes → Dashboard → Media Manager → Global Search → Import/Export → Bulk Actions
