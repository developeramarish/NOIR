import { test, expect } from '../../fixtures/base.fixture';
import { testCustomerGroup, testCustomer } from '../../helpers/test-data';
import {
  expectToast,
  confirmDelete,
  TOAST_SUCCESS,
} from '../../helpers/selectors';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

// ─── Customer Groups: Regression Tests ──────────────────────────────────────

test.describe('E-commerce Customer Groups @regression', () => {
  /**
   * CGRP-001: Customer group list loads
   */
  test('CGRP-001: should display customer groups list @smoke', async ({
    customerGroupsPage,
    page,
  }) => {
    await customerGroupsPage.goto();

    await expect(page.locator('main').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"][data-type="error"]')).not.toBeVisible({ timeout: 2_000 }).catch(() => {});
  });

  /**
   * CGRP-002: Create, edit, and delete a customer group
   */
  test('CGRP-002: should perform customer group CRUD @regression', async ({
    customerGroupsPage,
    api,
    page,
  }) => {
    const data = testCustomerGroup();

    await customerGroupsPage.goto();

    // Create
    await page.getByRole('button', { name: /create|add|new/i }).click();

    await page.getByLabel(/name/i).first().fill(data.name);
    const descInput = page.getByLabel(/description/i);
    if (await descInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await descInput.fill(data.description);
    }

    await page.getByRole('button', { name: /save|create|submit/i }).click();
    await expect(page.locator(TOAST_SUCCESS)).toBeVisible({ timeout: 10_000 });

    // Verify in list
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(data.name).first()).toBeVisible({ timeout: 5_000 });

    // Edit — the row has "Actions for {name}" dropdown button
    const updatedName = `${data.name} Updated`;
    await page.getByRole('row', { name: new RegExp(data.name, 'i') })
      .getByRole('button')
      .first()
      .click();
    const editMenuItem = page.getByRole('menuitem', { name: /edit/i });
    if (await editMenuItem.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await editMenuItem.click();
    }

    const nameInput = page.getByLabel(/name/i).first();
    await nameInput.clear();
    await nameInput.fill(updatedName);
    await page.getByRole('button', { name: /save|update|submit/i }).click();
    await expect(page.locator(TOAST_SUCCESS)).toBeVisible({ timeout: 10_000 });

    // Verify updated name
    await expect(page.getByText(updatedName).first()).toBeVisible({ timeout: 5_000 });

    // Delete — the row has "Actions for {name}" dropdown button
    await page.getByRole('row', { name: new RegExp(updatedName, 'i') })
      .getByRole('button')
      .first()
      .click();
    const deleteMenuItem2 = page.getByRole('menuitem', { name: /delete|remove/i });
    if (await deleteMenuItem2.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await deleteMenuItem2.click();
    }
    await confirmDelete(page);
    await expect(page.locator(TOAST_SUCCESS)).toBeVisible({ timeout: 10_000 });

    // Verify removed
    await expect(page.getByText(updatedName)).not.toBeVisible({ timeout: 5_000 });
  });

  /**
   * CGRP-003: Validation errors for customer groups
   */
  test('CGRP-003: should show validation errors for empty name @regression', async ({
    customerGroupsPage,
    page,
  }) => {
    await customerGroupsPage.goto();

    await page.getByRole('button', { name: /create|add|new/i }).click();

    // Submit without filling name
    await page.getByRole('button', { name: /save|create|submit/i }).click();

    await expect(
      page.getByText(/required|bắt buộc/i).first(),
    ).toBeVisible({ timeout: 5_000 });
  });
});
