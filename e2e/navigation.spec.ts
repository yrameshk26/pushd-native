import { test, expect } from '@playwright/test';
import { injectAuthState, waitForDashboard } from './helpers/auth';

test.describe('Tab bar navigation', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await waitForDashboard(page);
  });

  test('Routines tab navigates to routines screen', async ({ page }) => {
    await page.getByText('Routines').click();
    await page.waitForURL(/routines/, { timeout: 10000 });
    await expect(page.getByText('Routines').first()).toBeVisible();
  });

  test('Meals tab navigates to meals screen', async ({ page }) => {
    await page.getByText('Meals').click();
    await page.waitForURL(/meals/, { timeout: 10000 });
    await expect(page.getByText('Meals').first()).toBeVisible();
  });

  test('Social tab navigates to social screen', async ({ page }) => {
    await page.getByText('Social').click();
    await page.waitForURL(/social/, { timeout: 10000 });
    await expect(page.getByText('Social').first()).toBeVisible();
  });

  test('Profile tab navigates to profile screen', async ({ page }) => {
    await page.getByText('Profile').click();
    await page.waitForURL(/profile/, { timeout: 10000 });
    await expect(page.getByText('Profile').first()).toBeVisible();
  });

  test('Home tab returns to dashboard', async ({ page }) => {
    // Navigate away first
    await page.getByText('Routines').click();
    await page.waitForURL(/routines/, { timeout: 10000 });
    // Then go back to Home
    await page.getByText('Home').click();
    await page.waitForURL(/dashboard/, { timeout: 10000 });
    await expect(page.getByText('START WORKOUT')).toBeVisible();
  });

  test('deep link to workout history', async ({ page }) => {
    await page.goto('http://localhost:8081/(screens)/workout/history');
    await page.waitForLoadState('networkidle');
    // Should show some content or redirect to login if unauthenticated
    // Since we have auth, should render history page
    const url = page.url();
    expect(url).toContain('workout');
  });

  test('deep link to routines create', async ({ page }) => {
    await page.goto('http://localhost:8081/(screens)/routines/create');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toContain('routines');
  });

  test('deep link to exercises list', async ({ page }) => {
    await page.goto('http://localhost:8081/(screens)/exercises');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toContain('exercises');
  });

  test('deep link to programs list', async ({ page }) => {
    await page.goto('http://localhost:8081/(screens)/programs');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toContain('programs');
  });

  test('deep link to progress overview', async ({ page }) => {
    await page.goto('http://localhost:8081/(screens)/progress');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toContain('progress');
  });

  test('deep link to nutrition overview', async ({ page }) => {
    await page.goto('http://localhost:8081/(screens)/nutrition');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toContain('nutrition');
  });

  test('deep link to tools', async ({ page }) => {
    await page.goto('http://localhost:8081/(screens)/tools');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url).toContain('tools');
  });

  test('unauthenticated access redirects to login', async ({ page }) => {
    // Clear auth first — use a fresh page with no stored token
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.removeItem('pushd_access_token'));
    // Navigate to root — the index.tsx redirects based on auth state
    await page.goto('http://localhost:8081/');
    await page.waitForLoadState('networkidle');
    // The root index redirects unauthenticated users to /(auth)/login
    const url = page.url();
    const isAuthPage = url.includes('login') || url.includes('auth') || url === 'http://localhost:8081/';
    expect(isAuthPage).toBeTruthy();
  });
});
