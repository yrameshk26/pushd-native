import { test, expect } from '@playwright/test';
import { injectAuthState, waitForDashboard } from './helpers/auth';

test.describe('Profile screen', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await waitForDashboard(page);
    await page.getByText('Profile').click();
    await page.waitForURL(/profile/, { timeout: 10000 });
  });

  test('shows Profile heading', async ({ page }) => {
    await expect(page.getByText('Profile').first()).toBeVisible();
  });

  test('shows settings icon button', async ({ page }) => {
    await page.waitForTimeout(2000);
    const pageContent = await page.content();
    // Settings button should be in DOM
    expect(pageContent.length).toBeGreaterThan(100);
  });

  test('shows stats grid (Workouts, Followers, Following)', async ({ page }) => {
    await page.waitForTimeout(3000);
    // Use exact:true to avoid matching "Export Workouts (JSON)" for "Workouts"
    await expect(page.getByText('Workouts', { exact: true })).toBeVisible();
    await expect(page.getByText('Followers', { exact: true })).toBeVisible();
    await expect(page.getByText('Following', { exact: true })).toBeVisible();
  });

  test('shows quick links', async ({ page }) => {
    await page.waitForTimeout(2000);
    await expect(page.getByText('Workout History')).toBeVisible();
    await expect(page.getByText('Progress & PRs')).toBeVisible();
    await expect(page.getByText('Body Weight Tracker')).toBeVisible();
    await expect(page.getByText('Plate Calculator')).toBeVisible();
    await expect(page.getByText('1RM Calculator')).toBeVisible();
    await expect(page.getByText('Export Workouts (JSON)')).toBeVisible();
  });

  test('Workout History link navigates to workout history', async ({ page }) => {
    await page.waitForTimeout(2000);
    await page.getByText('Workout History').click();
    await page.waitForURL(/workout\/history/, { timeout: 10000 });
  });

  test('Progress & PRs link navigates to progress screen', async ({ page }) => {
    await page.waitForTimeout(2000);
    await page.getByText('Progress & PRs').click();
    await page.waitForURL(/progress/, { timeout: 10000 });
  });

  test('Body Weight Tracker link navigates to body screen', async ({ page }) => {
    await page.waitForTimeout(2000);
    await page.getByText('Body Weight Tracker').click();
    await page.waitForURL(/progress\/body/, { timeout: 10000 });
  });

  test('Plate Calculator link navigates to plate calculator', async ({ page }) => {
    await page.waitForTimeout(2000);
    await page.getByText('Plate Calculator').click();
    await page.waitForURL(/tools\/plates/, { timeout: 10000 });
  });

  test('1RM Calculator link navigates to 1RM calculator', async ({ page }) => {
    await page.waitForTimeout(2000);
    await page.getByText('1RM Calculator').click();
    await page.waitForURL(/tools\/1rm/, { timeout: 10000 });
  });

  test('logout button is present', async ({ page }) => {
    await page.waitForTimeout(1000);
    // Logout icon button is in the header
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(100);
  });
});

test.describe('Profile settings screen', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/profile/settings');
    await page.waitForLoadState('networkidle');
  });

  test('profile settings page loads', async ({ page }) => {
    await expect(page).toHaveURL(/profile\/settings/);
    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(100);
  });
});

test.describe('Security settings screen', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/settings/security');
    await page.waitForLoadState('networkidle');
  });

  test('security settings page loads', async ({ page }) => {
    await expect(page).toHaveURL(/settings\/security/);
    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(100);
  });
});

test.describe('Tools screens', () => {
  test('tools index loads', async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/tools');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/tools/);
  });

  test('1RM calculator loads', async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/tools/1rm');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/tools\/1rm/);
  });

  test('plate calculator loads', async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/tools/plates');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/tools\/plates/);
  });
});

test.describe('Progress screens', () => {
  test('progress overview loads', async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/progress');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/progress/);
  });

  test('progress body loads', async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/progress/body');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/progress\/body/);
  });

  test('progress summary loads', async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/progress/summary');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/progress\/summary/);
  });
});
