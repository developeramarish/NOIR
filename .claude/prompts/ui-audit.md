# UI/UX Audit — Automated Pipeline

Run the NOIR UI audit system: 52 pages, 11 custom rules, axe-core accessibility scanning, and Storybook story validation.

## Step 1: Verify Prerequisites

Check that both backend and frontend are running:

```bash
curl -sf http://localhost:4000/api/health > /dev/null && echo "Backend: OK" || echo "Backend: NOT RUNNING"
curl -sf http://localhost:3000 > /dev/null && echo "Frontend: OK" || echo "Frontend: NOT RUNNING"
```

If either is not running, start them with `./start-dev.sh` or manually:
- Backend: `cd src/NOIR.Web && dotnet run`
- Frontend (Windows): `powershell -Command "Start-Process cmd -ArgumentList '/c cd /d src\NOIR.Web\frontend && pnpm run dev'"`

Optional — also check Storybook for story-level audit:
```bash
curl -sf http://localhost:6006 > /dev/null && echo "Storybook: OK" || echo "Storybook: NOT RUNNING (optional)"
```

## Step 2: Run the Audit

```bash
cd src/NOIR.Web/frontend/e2e && npx playwright test --project=ui-audit --project=ui-audit-platform
```

This runs:
- **ui-audit**: 51 admin pages (tenant admin auth)
- **ui-audit-platform**: 4 platform admin pages (platform admin auth)
- **11 custom rules**: cursor-pointer, aria-label, datatable-actions, dialog-footer, badge-variant, empty-state, native-title, gradient-text, destructive-button, console-errors, network-errors
- **axe-core**: WCAG 2.2 accessibility scanning per page + per tab + per dialog

Output: `.ui-audit/` directory (gitignored)

## Step 3: Read and Present Results

After the audit completes, read the generated reports:

1. **Summary**: `.ui-audit/summary.md` — severity counts, top rules, worst pages
2. **AI prompt**: `.ui-audit/prompt.md` — structured fix instructions grouped by source file
3. **Raw data**: `.ui-audit/raw/` — JSON files for programmatic analysis

Present to the user:
- Total issue count by severity (CRITICAL / HIGH / MEDIUM / LOW / INFO)
- Top 5 rules with most violations
- Top 5 pages with most issues
- Ask: "Want me to fix CRITICAL and HIGH issues now?"

## Step 4: Fix Issues (if requested)

Read `.ui-audit/prompt.md` and follow its instructions:
- Fix all CRITICAL and HIGH issues
- MEDIUM/LOW are recommended but optional
- Do NOT change UI behavior — only fix classes, components, attributes
- After all fixes: `cd src/NOIR.Web/frontend && pnpm run build`

## Step 5: Re-run to Verify (if fixes were applied)

```bash
cd src/NOIR.Web/frontend/e2e && npx playwright test --project=ui-audit --project=ui-audit-platform
```

Compare before/after issue counts. Goal: 0 CRITICAL, 0 HIGH.

---

## Variant: Storybook-Only Audit

To audit only Storybook stories (axe-core on all 98+ stories):

```bash
cd src/NOIR.Web/frontend/e2e && npx playwright test --project=ui-audit tests/ui-audit/storybook-audit.spec.ts
```

Requires Storybook running at http://localhost:6006.

## Variant: Single Page Audit

To audit a specific page by ID (from page-registry.ts):

```bash
cd src/NOIR.Web/frontend/e2e && npx playwright test --project=ui-audit -g "page: <page-id>"
```

Example: `npx playwright test --project=ui-audit -g "page: products"`
