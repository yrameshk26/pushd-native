import { test, expect } from '@playwright/test';
import { injectAuthState, waitForDashboard } from './helpers/auth';

test.describe('Dashboard screen', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await waitForDashboard(page);
  });

  test('shows START WORKOUT button', async ({ page }) => {
    await expect(page.getByText('START WORKOUT')).toBeVisible();
  });

  test('shows greeting text', async ({ page }) => {
    await expect(page.getByText('Good to see you,')).toBeVisible();
  });

  test('shows WEEKLY VOLUME section header', async ({ page }) => {
    await expect(page.getByText('WEEKLY VOLUME')).toBeVisible();
  });

  test('shows ACTIVITY section header', async ({ page }) => {
    await expect(page.getByText('ACTIVITY')).toBeVisible();
  });

  test('START WORKOUT button opens workout sheet', async ({ page }) => {
    await page.getByText('START WORKOUT').click();
    // Sheet should appear with "Start Workout" title (exact) and "Empty Workout" option
    await expect(page.getByText('Start Workout', { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Empty Workout')).toBeVisible();
  });

  test('workout sheet closes on close button click', async ({ page }) => {
    await page.getByText('START WORKOUT').click();
    await expect(page.getByText('Empty Workout')).toBeVisible({ timeout: 5000 });
    // Click the X close button in the sheet header
    await page.getByLabel('Close').click();
    // Sheet should close — Empty Workout text disappears
    await expect(page.getByText('Empty Workout')).not.toBeVisible({ timeout: 5000 });
  });

  test('Empty Workout option starts active workout', async ({ page }) => {
    await page.getByText('START WORKOUT').click();
    await expect(page.getByText('Empty Workout')).toBeVisible({ timeout: 5000 });
    await page.getByText('Empty Workout').click();
    await page.waitForURL(/workout\/active/, { timeout: 10000 });
  });

  test('tab bar is visible', async ({ page }) => {
    await expect(page.getByText('Home')).toBeVisible();
    await expect(page.getByText('Routines')).toBeVisible();
    await expect(page.getByText('Social')).toBeVisible();
    await expect(page.getByText('Meals')).toBeVisible();
    await expect(page.getByText('Profile')).toBeVisible();
  });

  test('See all link navigates to workout history when visible', async ({ page }) => {
    // "See all →" only appears if there are recent workouts; test its presence conditionally
    const seeAll = page.getByText('See all →');
    const isVisible = await seeAll.isVisible();
    if (isVisible) {
      await seeAll.click();
      await page.waitForURL(/workout\/history/, { timeout: 10000 });
    } else {
      // No recent workouts — just verify dashboard still renders
      await expect(page.getByText('START WORKOUT')).toBeVisible();
    }
  });
});
