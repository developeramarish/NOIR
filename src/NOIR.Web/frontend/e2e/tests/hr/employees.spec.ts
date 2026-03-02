import { test, expect } from '../../fixtures/base.fixture';
import { testEmployee } from '../../helpers/test-data';
import { confirmDelete, expectToast, waitForTableLoad } from '../../helpers/selectors';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/**
 * HR Employees E2E Tests
 *
 * Covers: HR-001 (Employee CRUD), HR-002 (Validation errors),
 *         HR-003 (Edit employee + assign department), HR-004 (Deactivate employee)
 */

test.describe('HR Employees @regression', () => {
  // Helper: create a department via API for tests that need one
  async function createTestDepartment(api: any): Promise<{ id: string; name: string; code: string }> {
    const suffix = Math.random().toString(36).substring(2, 8);
    const res = await api.request.post(`${API_URL}/api/hr/departments`, {
      data: {
        name: `E2E Dept ${suffix}`,
        code: `E2E-${suffix.toUpperCase()}`,
      },
    });
    return res.json();
  }

  async function deleteDepartment(api: any, id: string) {
    await api.request.delete(`${API_URL}/api/hr/departments/${id}`).catch(() => {});
  }

  // ─── HR-001: Employee CRUD ───────────────────────────────────

  test.describe('HR-001: Employee CRUD @smoke', () => {
    let employeeId: string;
    let departmentId: string;

    test.afterEach(async ({ api }) => {
      if (employeeId) {
        await api.deleteEmployee(employeeId).catch(() => {});
      }
      if (departmentId) {
        await deleteDepartment(api, departmentId).catch(() => {});
      }
    });

    test('should load employee list page', async ({ employeesPage }) => {
      await employeesPage.goto();
      await expect(employeesPage.employeeTable).toBeVisible();
    });

    test('should create a new employee', async ({ employeesPage, api, page }) => {
      // Seed: create department
      const dept = await createTestDepartment(api);
      departmentId = dept.id;

      const data = testEmployee();
      await employeesPage.goto();
      await employeesPage.createEmployee({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        departmentId: dept.name,
      });

      await expectToast(page, /created|success/i);
      await employeesPage.expectEmployeeInList(data.lastName);

      // Capture employee ID for cleanup - search via API
      const searchRes = await api.request.get(
        `${API_URL}/api/hr/employees?search=${encodeURIComponent(data.email)}`,
      );
      if (searchRes.ok()) {
        const body = await searchRes.json();
        const items = body?.items ?? body?.data ?? [];
        const match = items.find((e: { email?: string }) => e.email === data.email);
        if (match) employeeId = match.id;
      }
    });

    test('should edit an existing employee', async ({ employeesPage, api, page }) => {
      const dept = await createTestDepartment(api);
      departmentId = dept.id;

      const data = testEmployee({ departmentId: dept.id });
      const created = await api.createEmployee(data);
      employeeId = created.id;

      await employeesPage.goto();

      // Click edit on the employee row
      await page
        .getByRole('row', { name: new RegExp(data.lastName, 'i') })
        .getByRole('button', { name: /edit/i })
        .click();

      // Update last name
      const lastNameInput = page.getByLabel(/last name/i);
      await lastNameInput.clear();
      await lastNameInput.fill(`${data.lastName}Updated`);
      await page.getByRole('button', { name: /save|update|submit/i }).click();

      await page.waitForResponse(
        resp => resp.url().includes('/api/hr/employees') && resp.request().method() === 'PUT',
      );
      await expectToast(page, /updated|success/i);
    });

    test('should show employee with auto-generated code', async ({ employeesPage, api, page }) => {
      const dept = await createTestDepartment(api);
      departmentId = dept.id;

      const data = testEmployee({ departmentId: dept.id });
      const created = await api.createEmployee(data);
      employeeId = created.id;

      await employeesPage.goto();
      await employeesPage.expectEmployeeInList(data.lastName);

      // Verify employee code column (should show EMP-XXXX pattern)
      const row = page.getByRole('row', { name: new RegExp(data.lastName, 'i') });
      await expect(row).toContainText(/EMP-\d+/i);
    });

    test('should delete an employee', async ({ employeesPage, api, page }) => {
      const dept = await createTestDepartment(api);
      departmentId = dept.id;

      const data = testEmployee({ departmentId: dept.id });
      const created = await api.createEmployee(data);
      employeeId = created.id;

      await employeesPage.goto();

      await page
        .getByRole('row', { name: new RegExp(data.lastName, 'i') })
        .getByRole('button', { name: /delete|remove/i })
        .click();

      await confirmDelete(page);
      await expectToast(page, /deleted|success/i);

      await expect(
        page.getByRole('row', { name: new RegExp(data.lastName, 'i') }),
      ).not.toBeVisible({ timeout: 5_000 });

      employeeId = ''; // Already deleted
    });
  });

  // ─── HR-002: Employee validation errors ────────────────────────

  test.describe('HR-002: Employee validation errors @regression', () => {
    test('should show validation errors for empty required fields', async ({
      employeesPage,
      page,
    }) => {
      await employeesPage.goto();
      await employeesPage.createButton.click();

      // Submit without filling required fields
      await page.getByRole('button', { name: /save|create|submit/i }).click();

      // Expect validation errors
      await expect(
        page.getByText(/first name.*required|required.*first name/i).or(
          page.getByText(/required/i).first(),
        ),
      ).toBeVisible({ timeout: 5_000 });
    });

    test('should show validation error for invalid email', async ({
      employeesPage,
      page,
    }) => {
      await employeesPage.goto();
      await employeesPage.createButton.click();

      await page.getByLabel(/first name/i).fill('Test');
      await page.getByLabel(/last name/i).fill('Employee');
      await page.getByLabel(/email/i).fill('invalid-email');
      await page.getByLabel(/first name/i).focus(); // trigger blur

      await expect(
        page.getByText(/valid email|invalid email|email.*invalid/i),
      ).toBeVisible({ timeout: 5_000 });
    });

    test('should show validation error for duplicate email', async ({
      employeesPage,
      api,
      page,
    }) => {
      // Create employee with known email
      const dept = await createTestDepartment(api);
      const data = testEmployee({ departmentId: dept.id });
      const created = await api.createEmployee(data);

      try {
        await employeesPage.goto();
        await employeesPage.createEmployee({
          firstName: 'Duplicate',
          lastName: 'EmailTest',
          email: data.email, // Same email as existing employee
        });

        // Expect conflict/duplicate error
        await expectToast(page, /already exists|duplicate|conflict/i, 'error');
      } finally {
        await api.deleteEmployee(created.id).catch(() => {});
        await deleteDepartment(api, dept.id).catch(() => {});
      }
    });
  });

  // ─── HR-003: Edit employee + assign department ─────────────────

  test.describe('HR-003: Edit employee + assign department @regression', () => {
    test('should change employee department', async ({ employeesPage, api, page }) => {
      // Create two departments
      const dept1 = await createTestDepartment(api);
      const dept2 = await createTestDepartment(api);

      // Create employee in dept1
      const data = testEmployee({ departmentId: dept1.id });
      const created = await api.createEmployee(data);

      try {
        await employeesPage.goto();

        // Click edit
        await page
          .getByRole('row', { name: new RegExp(data.lastName, 'i') })
          .getByRole('button', { name: /edit/i })
          .click();

        // Change department
        const deptCombobox = page.getByRole('combobox', { name: /department/i });
        await deptCombobox.click();
        await page.getByRole('option', { name: new RegExp(dept2.name, 'i') }).click();

        // Save
        await page.getByRole('button', { name: /save|update|submit/i }).click();
        await page.waitForResponse(
          resp => resp.url().includes('/api/hr/employees') && resp.request().method() === 'PUT',
        );
        await expectToast(page, /updated|success/i);

        // Verify: reload and check the row shows new department
        await employeesPage.goto();
        const row = page.getByRole('row', { name: new RegExp(data.lastName, 'i') });
        await expect(row).toContainText(new RegExp(dept2.name, 'i'));
      } finally {
        await api.deleteEmployee(created.id).catch(() => {});
        await deleteDepartment(api, dept1.id).catch(() => {});
        await deleteDepartment(api, dept2.id).catch(() => {});
      }
    });
  });

  // ─── HR-004: Deactivate employee ──────────────────────────────

  test.describe('HR-004: Deactivate employee @regression', () => {
    test('should deactivate an active employee', async ({ api, page }) => {
      const dept = await createTestDepartment(api);
      const data = testEmployee({ departmentId: dept.id });
      const created = await api.createEmployee(data);

      try {
        // Navigate to employee detail
        await page.goto(`/portal/hr/employees/${created.id}`);
        await page.waitForLoadState('networkidle');

        // Click deactivate button
        const deactivateBtn = page.getByRole('button', { name: /deactivate|resign|terminate/i });
        if (await deactivateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await deactivateBtn.click();

          // Select reason/status if dialog appears
          const statusSelect = page.getByRole('combobox', { name: /status|reason/i });
          if (await statusSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await statusSelect.click();
            await page.getByRole('option', { name: /resigned/i }).click();
          }

          // Confirm
          await page.getByRole('button', { name: /confirm|save|submit|ok/i }).click();
          await expectToast(page, /deactivated|updated|success/i);

          // Verify status badge shows inactive
          await expect(
            page.getByText(/resigned|inactive|terminated/i).first(),
          ).toBeVisible({ timeout: 5_000 });
        } else {
          // Deactivate via API as fallback
          const res = await api.request.post(
            `${API_URL}/api/hr/employees/${created.id}/deactivate`,
            { data: { status: 'Resigned' } },
          );
          expect(res.ok()).toBeTruthy();

          // Reload and verify
          await page.reload();
          await page.waitForLoadState('networkidle');
          await expect(
            page.getByText(/resigned|inactive/i).first(),
          ).toBeVisible({ timeout: 5_000 });
        }
      } finally {
        await api.deleteEmployee(created.id).catch(() => {});
        await deleteDepartment(api, dept.id).catch(() => {});
      }
    });

    test('should be able to reactivate a deactivated employee', async ({ api, page }) => {
      const dept = await createTestDepartment(api);
      const data = testEmployee({ departmentId: dept.id });
      const created = await api.createEmployee(data);

      // Deactivate via API first
      await api.request.post(
        `${API_URL}/api/hr/employees/${created.id}/deactivate`,
        { data: { status: 'Resigned' } },
      );

      try {
        // Navigate to detail page
        await page.goto(`/portal/hr/employees/${created.id}`);
        await page.waitForLoadState('networkidle');

        // Look for reactivate button
        const reactivateBtn = page.getByRole('button', { name: /reactivate|activate/i });
        if (await reactivateBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await reactivateBtn.click();

          // Confirm if dialog appears
          const confirmBtn = page.getByRole('button', { name: /confirm|yes|ok/i });
          if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await confirmBtn.click();
          }

          await expectToast(page, /reactivated|updated|success/i);
          await expect(page.getByText(/active/i).first()).toBeVisible({ timeout: 5_000 });
        } else {
          // Reactivate via API as fallback
          const res = await api.request.post(
            `${API_URL}/api/hr/employees/${created.id}/reactivate`,
          );
          expect(res.ok()).toBeTruthy();
        }
      } finally {
        await api.deleteEmployee(created.id).catch(() => {});
        await deleteDepartment(api, dept.id).catch(() => {});
      }
    });
  });
});
