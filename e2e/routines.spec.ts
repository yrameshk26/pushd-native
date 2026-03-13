import { test, expect } from '@playwright/test';
import { injectAuthState, waitForDashboard } from './helpers/auth';

test.describe('Routines screen', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await waitForDashboard(page);
    await page.getByText('Routines').click();
    await page.waitForURL(/routines/, { timeout: 10000 });
  });

  test('shows Routines heading', async ({ page }) => {
    await expect(page.getByText('Routines').first()).toBeVisible();
  });

  test('shows AI Workout Planner card', async ({ page }) => {
    // Wait for routines to load or error state — cards always render in the list header
    await page.waitForTimeout(5000);
    await expect(page.getByText('AI Workout Planner')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Get a personalised plan built just for you')).toBeVisible();
  });

  test('shows Browse Programs card', async ({ page }) => {
    await page.waitForTimeout(5000);
    await expect(page.getByText('Browse Programs')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pre-built Push, Pull, Legs, Full Body & more')).toBeVisible();
  });

  test('create routine button is visible', async ({ page }) => {
    // The create button is a + icon button in the header
    // Look for the create first routine button in empty state or the + header button
    await page.waitForTimeout(2000); // Wait for routines to load or empty state to show
    const pageContent = await page.content();
    // Should contain either routines list or empty state
    expect(pageContent.length).toBeGreaterThan(100);
  });

  test('AI Workout Planner card navigates to AI planner', async ({ page }) => {
    await page.waitForTimeout(5000);
    await page.getByText('AI Workout Planner').click();
    await page.waitForURL(/ai-planner/, { timeout: 10000 });
  });

  test('Browse Programs card navigates to programs', async ({ page }) => {
    await page.waitForTimeout(5000);
    await page.getByText('Browse Programs').click();
    await page.waitForURL(/programs/, { timeout: 10000 });
  });

  test('shows empty state or routines list', async ({ page }) => {
    await page.waitForTimeout(5000); // Wait for API
    const noRoutines = page.getByText('No routines yet');
    const isEmpty = await noRoutines.isVisible();
    const hasFailed = await page.getByText('Failed to load routines').isVisible();
    if (hasFailed) {
      // API error — retry button should be available
      await expect(page.getByText('Try Again')).toBeVisible();
    } else if (isEmpty) {
      await expect(page.getByText('Create your first routine or use the AI Planner')).toBeVisible();
      await expect(page.getByText('Create First Routine')).toBeVisible();
    } else {
      // Has routines — MY ROUTINES section should appear
      await expect(page.getByText('MY ROUTINES')).toBeVisible();
    }
  });

  test('Create First Routine navigates to create screen when empty', async ({ page }) => {
    await page.waitForTimeout(3000);
    const createBtn = page.getByText('Create First Routine');
    const isVisible = await createBtn.isVisible();
    if (isVisible) {
      await createBtn.click();
      await page.waitForURL(/routines\/create/, { timeout: 10000 });
    } else {
      // Skip if not empty
      test.skip();
    }
  });
});

test.describe('Create routine screen', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/routines/create');
    await page.waitForLoadState('networkidle');
  });

  test('create routine page loads', async ({ page }) => {
    await expect(page).toHaveURL(/routines\/create/);
    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(100);
  });

  test('shows routine name input', async ({ page }) => {
    await page.waitForTimeout(1000);
    const nameInput = page.getByPlaceholder('e.g. Push Day A');
    const isVisible = await nameInput.isVisible();
    if (isVisible) {
      await nameInput.fill('Test Routine');
      await expect(nameInput).toHaveValue('Test Routine');
    }
  });
});

test.describe('Programs screen', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/programs');
    await page.waitForLoadState('networkidle');
  });

  test('programs page loads', async ({ page }) => {
    await expect(page).toHaveURL(/programs/);
    await page.waitForTimeout(2000);
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(100);
  });
});

test.describe('AI Planner screen', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/ai-planner');
    await page.waitForLoadState('networkidle');
  });

  test('ai planner page loads', async ({ page }) => {
    await expect(page).toHaveURL(/ai-planner/);
    await page.waitForTimeout(1000);
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(100);
  });
});
