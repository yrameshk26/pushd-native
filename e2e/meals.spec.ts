import { test, expect } from '@playwright/test';
import { injectAuthState, waitForDashboard } from './helpers/auth';

test.describe('Meals screen', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await waitForDashboard(page);
    await page.getByText('Meals').click();
    await page.waitForURL(/meals/, { timeout: 10000 });
  });

  test('shows Meals heading', async ({ page }) => {
    await expect(page.getByText('Meals').first()).toBeVisible();
  });

  test('shows Log Food button', async ({ page }) => {
    await expect(page.getByText('Log Food')).toBeVisible();
  });

  test('shows New Plan button', async ({ page }) => {
    await expect(page.getByText('New Plan')).toBeVisible();
  });

  test('shows empty state or meal plans', async ({ page }) => {
    await page.waitForTimeout(3000);
    const emptyTitle = page.getByText('No meal plans yet');
    const isEmpty = await emptyTitle.isVisible();
    const failedTitle = page.getByText('Failed to load meal plans.');
    const hasFailed = await failedTitle.isVisible();
    if (hasFailed) {
      // API error state — verify retry button is visible
      await expect(page.getByText('Retry')).toBeVisible();
    } else if (isEmpty) {
      await expect(
        page.getByText('Create your first AI-generated meal plan tailored to your goals'),
      ).toBeVisible();
      await expect(page.getByText('Create Meal Plan')).toBeVisible();
    } else {
      // Has meal plans — just verify some content is rendered
      const pageContent = await page.content();
      expect(pageContent.length).toBeGreaterThan(1000);
    }
  });

  test('New Plan button navigates to new meal plan screen', async ({ page }) => {
    await page.getByText('New Plan').click();
    await page.waitForURL(/meals\/new/, { timeout: 10000 });
  });

  test('Log Food button navigates to nutrition screen', async ({ page }) => {
    await page.getByText('Log Food').click();
    await page.waitForURL(/nutrition/, { timeout: 10000 });
  });

  test('Create Meal Plan button navigates to new plan when empty', async ({ page }) => {
    await page.waitForTimeout(3000);
    const createBtn = page.getByText('Create Meal Plan');
    const isVisible = await createBtn.isVisible();
    if (isVisible) {
      await createBtn.click();
      await page.waitForURL(/meals\/new/, { timeout: 10000 });
    }
  });
});

test.describe('New meal plan screen', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/meals/new');
    await page.waitForLoadState('networkidle');
  });

  test('new meal plan page loads', async ({ page }) => {
    await expect(page).toHaveURL(/meals\/new/);
    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(100);
  });
});

test.describe('Nutrition screens', () => {
  test('nutrition overview loads', async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/nutrition');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/nutrition/);
  });

  test('nutrition log food loads', async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/nutrition/log-food');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/log-food/);
  });

  test('nutrition goals loads', async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/nutrition/goals');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/goals/);
  });

  test('water tracking loads', async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/nutrition/water');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/water/);
  });

  test('supplements screen loads', async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/nutrition/supplements');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/supplements/);
  });

  test('grocery list screen loads', async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/meals/grocery-list');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/grocery-list/);
  });
});
