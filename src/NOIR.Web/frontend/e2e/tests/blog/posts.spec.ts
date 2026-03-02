import { test, expect } from '../../fixtures/base.fixture';
import { testBlogPost, testBlogCategory, testBlogTag } from '../../helpers/test-data';
import { confirmDelete, expectToast } from '../../helpers/selectors';

test.describe('Blog Posts @smoke', () => {
  test('BLOG-001: should display blog post list @smoke', async ({
    blogPostsPage,
    page,
  }) => {
    await blogPostsPage.goto();
    await expect(blogPostsPage.postTable.or(page.locator('main')).first()).toBeVisible();
    // Page should load without error states
    await expect(page.locator('[role="alert"][data-type="error"]')).not.toBeVisible();
  });

  test('BLOG-002: should create blog post via UI @smoke', async ({
    blogPostsPage,
    api,
    page,
  }) => {
    const data = testBlogPost();
    let postId: string | undefined;

    try {
      await blogPostsPage.gotoNew();

      // Fill title
      await page.getByLabel('Title', { exact: true }).fill(data.title);

      // Wait for TinyMCE or contenteditable editor to be ready
      const editorFrame = page.locator('iframe[id*="tinymce"]');
      const hasIframe = await editorFrame.isVisible({ timeout: 5_000 }).catch(() => false);

      if (hasIframe) {
        const editorBody = editorFrame.contentFrame().locator('body[contenteditable="true"]');
        await editorBody.waitFor({ state: 'visible', timeout: 10_000 });
        await editorBody.fill('E2E test blog content');
      } else {
        const editableDiv = page.locator('[contenteditable="true"]').first();
        if (await editableDiv.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await editableDiv.fill('E2E test blog content');
        }
      }

      await page.getByRole('button', { name: /save|publish|create/i }).click();

      // Verify success
      await expect(page.locator('[data-sonner-toast][data-type="success"]')).toBeVisible({ timeout: 10_000 });

      // Get created post ID from URL if redirected
      const url = page.url();
      const match = url.match(/posts\/([a-f0-9-]+)/);
      if (match) postId = match[1];
    } finally {
      if (postId) await api.deleteBlogPost(postId).catch(() => {});
    }
  });
});

test.describe('Blog Posts @regression', () => {
  test('BLOG-003: should edit blog post with rich content @regression', async ({
    api,
    page,
    blogPostsPage,
  }) => {
    const data = testBlogPost();
    const created = await api.createBlogPost(data);
    const postId = created.id ?? created.Id;

    try {
      await blogPostsPage.gotoEdit(postId);

      // Modify title
      const titleInput = page.getByLabel('Title', { exact: true });
      await titleInput.clear();
      await titleInput.fill(`${data.title} Updated`);

      await page.getByRole('button', { name: /save|update/i }).click();
      await expect(page.locator('[data-sonner-toast][data-type="success"]')).toBeVisible({ timeout: 10_000 });
    } finally {
      await api.deleteBlogPost(postId).catch(() => {});
    }
  });

  test('BLOG-004: should perform blog categories CRUD @regression', async ({
    api,
    page,
    blogPostsPage,
  }) => {
    await blogPostsPage.gotoCategories();

    const catData = testBlogCategory();

    // Create
    await page.getByRole('button', { name: /create|add|new/i }).click();
    await page.getByLabel(/name/i).first().fill(catData.name);
    await page.getByRole('button', { name: /save|create|submit/i }).click();
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toBeVisible({ timeout: 10_000 });

    // Verify in list
    await expect(page.getByText(catData.name).first()).toBeVisible();

    // Delete
    await page.getByRole('row', { name: new RegExp(catData.name, 'i') })
      .getByRole('button', { name: /delete|remove/i })
      .click();
    await confirmDelete(page);
  });

  test('BLOG-005: should perform blog tags CRUD @regression', async ({
    api,
    page,
    blogPostsPage,
  }) => {
    await blogPostsPage.gotoTags();

    const tagData = testBlogTag();

    // Create
    await page.getByRole('button', { name: /create|add|new/i }).click();
    await page.getByLabel(/name/i).first().fill(tagData.name);
    await page.getByRole('button', { name: /save|create|submit/i }).click();
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toBeVisible({ timeout: 10_000 });

    // Verify in list
    await expect(page.getByText(tagData.name).first()).toBeVisible();

    // Delete
    await page.getByRole('row', { name: new RegExp(tagData.name, 'i') })
      .getByRole('button', { name: /delete|remove/i })
      .click();
    await confirmDelete(page);
  });

  test('BLOG-006: should delete blog post with confirmation @regression', async ({
    api,
    page,
    blogPostsPage,
  }) => {
    const data = testBlogPost();
    const created = await api.createBlogPost(data);
    const postId = created.id ?? created.Id;

    await blogPostsPage.goto();

    // Find and delete the post
    await page.getByRole('row', { name: new RegExp(data.title, 'i') })
      .getByRole('button', { name: /delete|remove/i })
      .click();

    await confirmDelete(page);
    await expect(page.locator('[data-sonner-toast][data-type="success"]')).toBeVisible({ timeout: 10_000 });

    // Verify removed from list
    await expect(page.getByRole('row', { name: new RegExp(data.title, 'i') })).not.toBeVisible();
  });
});
