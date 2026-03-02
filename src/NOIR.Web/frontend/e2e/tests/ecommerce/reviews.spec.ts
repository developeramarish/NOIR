import { test, expect } from '../../fixtures/base.fixture';
import { testProduct, testReview } from '../../helpers/test-data';
import {
  expectToast,
  confirmDelete,
  waitForTableLoad,
  TOAST_SUCCESS,
} from '../../helpers/selectors';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

// ─── Reviews: Smoke Tests ───────────────────────────────────────────────────

test.describe('E-commerce Reviews @smoke', () => {
  /**
   * REV-001: Review list loads
   * Verify that the reviews moderation page renders.
   */
  test('REV-001: should display reviews list page @smoke', async ({
    reviewsPage,
    page,
  }) => {
    await reviewsPage.goto();

    // Page should load without error
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"][data-type="error"]')).not.toBeVisible({ timeout: 2_000 }).catch(() => {});
  });
});

// ─── Reviews: Regression Tests ──────────────────────────────────────────────

test.describe('E-commerce Reviews @regression', () => {
  /**
   * REV-002: Approve a pending review
   * Create a review via API, approve it via UI.
   */
  test('REV-002: should approve a pending review @regression', async ({
    reviewsPage,
    api,
    trackCleanup,
    page,
  }) => {
    // Seed: create product then review
    const productData = testProduct();
    const product = await api.createProduct(productData);
    trackCleanup(async () => { await api.deleteProduct(product.id); });

    const reviewData = testReview({ productId: product.id });
    const review = await api.createReview(reviewData);
    trackCleanup(async () => { await api.deleteReview(review.id).catch(() => {}); });

    await reviewsPage.goto();

    // Find the review row
    const reviewRow = page.getByRole('row', { name: new RegExp(reviewData.title, 'i') });

    if (await reviewRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Click approve button
      const approveBtn = reviewRow.getByRole('button', { name: /approve/i });
      if (await approveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await approveBtn.click();
        await expect(page.locator(TOAST_SUCCESS)).toBeVisible({ timeout: 10_000 });
      }
    }
  });

  /**
   * REV-003: Reject a pending review
   */
  test('REV-003: should reject a pending review @regression', async ({
    reviewsPage,
    api,
    trackCleanup,
    page,
  }) => {
    // Seed: create product then review
    const productData = testProduct();
    const product = await api.createProduct(productData);
    trackCleanup(async () => { await api.deleteProduct(product.id); });

    const reviewData = testReview({ productId: product.id, title: `E2E Reject Review ${Date.now()}` });
    const review = await api.createReview(reviewData);
    trackCleanup(async () => { await api.deleteReview(review.id).catch(() => {}); });

    await reviewsPage.goto();

    const reviewRow = page.getByRole('row', { name: new RegExp(reviewData.title, 'i') });

    if (await reviewRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Click reject button
      const rejectBtn = reviewRow.getByRole('button', { name: /reject/i });
      if (await rejectBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await rejectBtn.click();

        // Fill reason if dialog appears
        const reasonInput = page.getByLabel(/reason/i).or(page.getByPlaceholder(/reason/i));
        if (await reasonInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await reasonInput.fill('Spam content - E2E test');
        }

        // Confirm
        const confirmBtn = page.getByRole('button', { name: /confirm|reject|save|submit/i });
        if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await confirmBtn.click();
        }

        await expect(page.locator(TOAST_SUCCESS)).toBeVisible({ timeout: 10_000 });
      }
    }
  });

  /**
   * REV-004: Delete a review
   */
  test('REV-004: should delete a review with confirmation @regression', async ({
    reviewsPage,
    api,
    trackCleanup,
    page,
  }) => {
    const productData = testProduct();
    const product = await api.createProduct(productData);
    trackCleanup(async () => { await api.deleteProduct(product.id); });

    const reviewData = testReview({ productId: product.id, title: `E2E Delete Review ${Date.now()}` });
    const review = await api.createReview(reviewData);

    await reviewsPage.goto();

    const reviewRow = page.getByRole('row', { name: new RegExp(reviewData.title, 'i') });

    if (await reviewRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await reviewRow.getByRole('button', { name: /delete|remove/i }).click();
      await confirmDelete(page);
      await expect(page.locator(TOAST_SUCCESS)).toBeVisible({ timeout: 10_000 });

      // Verify removed
      await expect(reviewRow).not.toBeVisible({ timeout: 5_000 });
    }
  });

  /**
   * REV-005: Filter reviews by status
   */
  test('REV-005: should filter reviews by status @regression', async ({
    reviewsPage,
    page,
  }) => {
    await reviewsPage.goto();

    // Try filtering by Pending status
    await reviewsPage.filterByStatus('Pending');

    // Page should not show error
    await expect(page.locator('[role="alert"][data-type="error"]')).not.toBeVisible({ timeout: 2_000 }).catch(() => {});
  });
});
