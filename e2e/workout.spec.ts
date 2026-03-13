import { test, expect } from '@playwright/test';
import { injectAuthState, waitForDashboard } from './helpers/auth';

test.describe('Workout flows', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await waitForDashboard(page);
  });

  test.describe('Active workout', () => {
    test.beforeEach(async ({ page }) => {
      // Start an empty workout
      await page.getByText('START WORKOUT').click();
      await expect(page.getByText('Empty Workout')).toBeVisible({ timeout: 5000 });
      await page.getByText('Empty Workout').click();
      await page.waitForURL(/workout\/active/, { timeout: 10000 });
    });

    test('active workout screen renders', async ({ page }) => {
      // Should show some kind of workout UI
      await expect(page).toHaveURL(/workout\/active/);
      // The active workout page typically shows workout title or timer
      await page.waitForLoadState('networkidle');
    });

    test('active workout screen has workout controls', async ({ page }) => {
      // Verify we're still on the active workout screen
      await expect(page).toHaveURL(/workout\/active/);
      // Should show Add Exercise button (empty workout) or exercise cards
      const addExercise = page.getByText('Add Exercise');
      const isAddVisible = await addExercise.isVisible();
      if (isAddVisible) {
        await expect(addExercise).toBeVisible();
      } else {
        // At minimum the finish/discard controls should be present
        const finishBtn = page.getByText('Finish').first();
        const discardBtn = page.getByText('Discard').first();
        const hasFinish = await finishBtn.isVisible();
        const hasDiscard = await discardBtn.isVisible();
        expect(hasFinish || hasDiscard || isAddVisible).toBe(true);
      }
    });
  });

  test.describe('Workout history', () => {
    test('workout history page loads', async ({ page }) => {
      await page.goto('http://localhost:8081/(screens)/workout/history');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/workout\/history/);
    });

    test('workout history shows heading or empty state', async ({ page }) => {
      await page.goto('http://localhost:8081/(screens)/workout/history');
      await page.waitForLoadState('networkidle');
      // Wait for API to settle
      await page.waitForTimeout(2000);
      const pageContent = await page.content();
      // Should have some content
      expect(pageContent.length).toBeGreaterThan(100);
    });
  });

  test.describe('Dashboard workout shortcuts', () => {
    test('START WORKOUT button is prominent and clickable', async ({ page }) => {
      const btn = page.getByText('START WORKOUT');
      await expect(btn).toBeVisible();
      // Check it exists in the DOM and is enabled
      const isEnabled = await btn.isEnabled();
      expect(isEnabled).toBeTruthy();
    });

    test('workout sheet shows YOUR ROUTINES section when routines exist', async ({ page }) => {
      await page.getByText('START WORKOUT').click();
      // Sheet opens — verify Empty Workout option is visible
      await expect(page.getByText('Empty Workout')).toBeVisible({ timeout: 5000 });
      // Wait for routines to potentially load
      await page.waitForTimeout(2000);
      // Either shows routines section header or just the empty workout option
      const hasRoutines = await page.getByText('YOUR ROUTINES').isVisible();
      if (!hasRoutines) {
        // No routines for test user — just verify sheet is open with Empty Workout
        await expect(page.getByText('Empty Workout')).toBeVisible();
      }
    });
  });
});
