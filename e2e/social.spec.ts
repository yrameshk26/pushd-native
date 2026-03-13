import { test, expect } from '@playwright/test';
import { injectAuthState, waitForDashboard } from './helpers/auth';

test.describe('Social screen', () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthState(page);
    await waitForDashboard(page);
    await page.getByText('Social').click();
    await page.waitForURL(/social/, { timeout: 10000 });
  });

  test('shows Social heading', async ({ page }) => {
    await expect(page.getByText('Social').first()).toBeVisible();
  });

  test('shows subtitle', async ({ page }) => {
    await expect(page.getByText('Connect, compete, and get inspired')).toBeVisible();
  });

  test('shows community banner', async ({ page }) => {
    // Use exact: true to avoid matching "See what the community is lifting"
    await expect(page.getByText('Community', { exact: true })).toBeVisible();
  });

  test('shows all section cards', async ({ page }) => {
    await expect(page.getByText('Following Feed', { exact: true })).toBeVisible();
    await expect(page.getByText('Workouts from people you follow')).toBeVisible();
    await expect(page.getByText('Discover', { exact: true })).toBeVisible();
    await expect(page.getByText('Explore public workouts')).toBeVisible();
    await expect(page.getByText('Leaderboard', { exact: true })).toBeVisible();
    await expect(page.getByText('Top lifters this week')).toBeVisible();
    // Use exact: true to avoid matching "Weekly & custom fitness challenges"
    await expect(page.getByText('Challenges', { exact: true })).toBeVisible();
    await expect(page.getByText('Find People', { exact: true })).toBeVisible();
  });

  test('shows Grow your network section', async ({ page }) => {
    await expect(page.getByText('Grow your network')).toBeVisible();
    await expect(page.getByText('Find athletes to follow')).toBeVisible();
  });

  test('Following Feed navigates to social feed', async ({ page }) => {
    await page.getByText('Following Feed').click();
    await page.waitForURL(/social\/feed/, { timeout: 10000 });
  });

  test('Discover navigates to discover screen', async ({ page }) => {
    await page.getByText('Discover').click();
    await page.waitForURL(/social\/discover/, { timeout: 10000 });
  });

  test('Leaderboard navigates to leaderboard screen', async ({ page }) => {
    await page.getByText('Leaderboard').click();
    await page.waitForURL(/social\/leaderboard/, { timeout: 10000 });
  });

  test('Challenges navigates to challenges screen', async ({ page }) => {
    // Use exact: true to avoid strict mode violation with "Weekly & custom fitness challenges"
    await page.getByText('Challenges', { exact: true }).click();
    await page.waitForURL(/social\/challenges/, { timeout: 10000 });
  });

  test('Find People navigates to search screen', async ({ page }) => {
    await page.getByText('Find People').click();
    await page.waitForURL(/social\/search/, { timeout: 10000 });
  });

  test('View feed link navigates to social feed', async ({ page }) => {
    await page.getByText('View feed').click();
    await page.waitForURL(/social\/feed/, { timeout: 10000 });
  });
});

test.describe('Social sub-screens', () => {
  test('social feed screen loads', async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/social/feed');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/social\/feed/);
  });

  test('social discover screen loads', async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/social/discover');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/social\/discover/);
  });

  test('social search screen loads', async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/social/search');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/social\/search/);
  });

  test('leaderboard screen loads', async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/social/leaderboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/social\/leaderboard/);
  });

  test('challenges screen loads', async ({ page }) => {
    await injectAuthState(page);
    await page.goto('http://localhost:8081/(screens)/social/challenges');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/social\/challenges/);
  });
});
