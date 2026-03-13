/**
 * Comprehensive Social Hub E2E Test
 *
 * Tests the Social tab in the Pushd Expo React Native web app at http://localhost:8081.
 * For each button/card on the social hub page:
 *   - Takes a screenshot
 *   - Checks if a new screen loaded
 *   - Reports URL changes and console errors
 *
 * Screenshots saved to /tmp/native-social-test/
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { injectAuthState, waitForDashboard } from './helpers/auth';

const SCREENSHOT_DIR = '/tmp/native-social-test';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let screenshotIndex = 0;
function screenshotPath(name: string): string {
  screenshotIndex++;
  return path.join(SCREENSHOT_DIR, `${String(screenshotIndex).padStart(2, '0')}-${name}.png`);
}

// Shared console error tracker
const consoleErrors: Array<{ test: string; type: string; text: string; url: string }> = [];

/**
 * Navigate to social hub and wait for it to fully render.
 * React Native Web uses animated routing — waitForURL + short settle time is needed.
 */
async function goToSocialHub(page: Page): Promise<void> {
  await page.goto('http://localhost:8081/(app)/social');
  // Wait until the Social heading is visible — confirms the component has mounted
  await page.waitForFunction(
    () => {
      const texts = Array.from(document.querySelectorAll('[dir="auto"]')).map((el) => el.textContent?.trim());
      return texts.includes('Social');
    },
    { timeout: 15000 },
  );
  // Allow data queries to settle
  await page.waitForTimeout(1500);
}

test.describe('Social Hub — comprehensive navigation test', () => {
  test.beforeEach(async ({ page }) => {
    // Collect console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push({
          test: test.info().title,
          type: msg.type(),
          text: msg.text(),
          url: page.url(),
        });
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push({
        test: test.info().title,
        type: 'pageerror',
        text: err.message,
        url: page.url(),
      });
    });

    await injectAuthState(page);
    await waitForDashboard(page);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Social Hub Renders
  // ───────────────────────────────────────────────────────────────────────────

  test('social hub page loads and shows all elements', async ({ page }) => {
    await goToSocialHub(page);
    await page.screenshot({ path: screenshotPath('social-hub-full'), fullPage: true });

    // Header elements
    await expect(page.getByText('Social').first()).toBeVisible();
    await expect(page.getByText('Connect, compete, and get inspired')).toBeVisible();

    // Community banner
    await expect(page.getByText('Community', { exact: true })).toBeVisible();
    await expect(page.getByText('View feed')).toBeVisible();

    // Section cards
    await expect(page.getByText('Following Feed', { exact: true })).toBeVisible();
    await expect(page.getByText('Workouts from people you follow')).toBeVisible();
    await expect(page.getByText('Discover', { exact: true })).toBeVisible();
    await expect(page.getByText('Explore public workouts')).toBeVisible();
    await expect(page.getByText('Leaderboard', { exact: true })).toBeVisible();
    await expect(page.getByText('Top lifters this week')).toBeVisible();
    await expect(page.getByText('Challenges', { exact: true })).toBeVisible();
    await expect(page.getByText('Weekly & custom fitness challenges')).toBeVisible();
    await expect(page.getByText('Find People', { exact: true })).toBeVisible();
    await expect(page.getByText('Search and follow other athletes')).toBeVisible();

    // Bottom card
    await expect(page.getByText('Grow your network')).toBeVisible();
    await expect(page.getByText('Find athletes to follow')).toBeVisible();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. View feed link (in the Community banner)
  // ───────────────────────────────────────────────────────────────────────────

  test('View feed link navigates to social feed', async ({ page }) => {
    await goToSocialHub(page);
    const urlBefore = page.url();
    await page.screenshot({ path: screenshotPath('before-view-feed'), fullPage: true });

    await page.getByText('View feed').click();
    await page.waitForURL(/social\/feed/, { timeout: 10000 });

    const urlAfter = page.url();
    await page.screenshot({ path: screenshotPath('after-view-feed'), fullPage: true });

    expect(urlAfter).toContain('social/feed');
    expect(urlAfter).not.toEqual(urlBefore);
    console.log(`[View feed] ${urlBefore} → ${urlAfter}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Following Feed card
  // ───────────────────────────────────────────────────────────────────────────

  test('Following Feed card navigates to feed screen', async ({ page }) => {
    await goToSocialHub(page);
    const urlBefore = page.url();
    await page.screenshot({ path: screenshotPath('before-following-feed'), fullPage: true });

    // The card text "Following Feed" (exact to avoid matching subtext)
    await page.getByText('Following Feed', { exact: true }).click();
    await page.waitForURL(/social\/feed/, { timeout: 10000 });

    const urlAfter = page.url();
    await page.screenshot({ path: screenshotPath('after-following-feed'), fullPage: true });

    expect(urlAfter).toContain('social/feed');
    console.log(`[Following Feed] ${urlBefore} → ${urlAfter}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Discover card
  // ───────────────────────────────────────────────────────────────────────────

  test('Discover card navigates to discover screen', async ({ page }) => {
    await goToSocialHub(page);
    const urlBefore = page.url();
    await page.screenshot({ path: screenshotPath('before-discover'), fullPage: true });

    await page.getByText('Discover', { exact: true }).click();
    await page.waitForURL(/social\/discover/, { timeout: 10000 });

    const urlAfter = page.url();
    await page.screenshot({ path: screenshotPath('after-discover'), fullPage: true });

    expect(urlAfter).toContain('social/discover');
    console.log(`[Discover] ${urlBefore} → ${urlAfter}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Leaderboard card
  // ───────────────────────────────────────────────────────────────────────────

  test('Leaderboard card navigates to leaderboard screen', async ({ page }) => {
    await goToSocialHub(page);
    const urlBefore = page.url();
    await page.screenshot({ path: screenshotPath('before-leaderboard'), fullPage: true });

    await page.getByText('Leaderboard', { exact: true }).click();
    await page.waitForURL(/social\/leaderboard/, { timeout: 10000 });

    const urlAfter = page.url();
    await page.screenshot({ path: screenshotPath('after-leaderboard'), fullPage: true });

    expect(urlAfter).toContain('social/leaderboard');
    console.log(`[Leaderboard] ${urlBefore} → ${urlAfter}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Challenges card
  // ───────────────────────────────────────────────────────────────────────────

  test('Challenges card navigates to challenges screen', async ({ page }) => {
    await goToSocialHub(page);
    const urlBefore = page.url();
    await page.screenshot({ path: screenshotPath('before-challenges'), fullPage: true });

    // exact: true avoids clicking on the description text "Weekly & custom fitness challenges"
    await page.getByText('Challenges', { exact: true }).click();
    await page.waitForURL(/social\/challenges/, { timeout: 10000 });

    const urlAfter = page.url();
    await page.screenshot({ path: screenshotPath('after-challenges'), fullPage: true });

    expect(urlAfter).toContain('social/challenges');
    console.log(`[Challenges] ${urlBefore} → ${urlAfter}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Find People card
  // ───────────────────────────────────────────────────────────────────────────

  test('Find People card navigates to search screen', async ({ page }) => {
    await goToSocialHub(page);
    const urlBefore = page.url();
    await page.screenshot({ path: screenshotPath('before-find-people'), fullPage: true });

    await page.getByText('Find People', { exact: true }).click();
    await page.waitForURL(/social\/search/, { timeout: 10000 });

    const urlAfter = page.url();
    await page.screenshot({ path: screenshotPath('after-find-people'), fullPage: true });

    expect(urlAfter).toContain('social/search');
    console.log(`[Find People] ${urlBefore} → ${urlAfter}`);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. Grow your network card
  // ───────────────────────────────────────────────────────────────────────────

  test('Grow your network card navigates to search screen', async ({ page }) => {
    await goToSocialHub(page);

    // Scroll to bottom to ensure the card is in view
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    const urlBefore = page.url();
    await page.screenshot({ path: screenshotPath('before-grow-network'), fullPage: true });

    await page.getByText('Grow your network').click();
    await page.waitForURL(/social\/search/, { timeout: 10000 });

    const urlAfter = page.url();
    await page.screenshot({ path: screenshotPath('after-grow-network'), fullPage: true });

    expect(urlAfter).toContain('social/search');
    console.log(`[Grow your network] ${urlBefore} → ${urlAfter}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sub-screen content tests — verify each target screen actually loads content
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Social sub-screens — content verification', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          test: test.info().title,
          type: msg.type(),
          text: msg.text(),
          url: page.url(),
        });
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push({
        test: test.info().title,
        type: 'pageerror',
        text: err.message,
        url: page.url(),
      });
    });
    await injectAuthState(page);
  });

  test('social feed screen loads content', async ({ page }) => {
    await page.goto('http://localhost:8081/(screens)/social/feed');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: screenshotPath('sub-feed'), fullPage: true });
    await expect(page).toHaveURL(/social\/feed/);
    // Should not show an error page
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).not.toContain('404');
    expect(pageText).not.toContain('Page Not Found');
  });

  test('discover screen loads content', async ({ page }) => {
    await page.goto('http://localhost:8081/(screens)/social/discover');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: screenshotPath('sub-discover'), fullPage: true });
    await expect(page).toHaveURL(/social\/discover/);
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).not.toContain('404');
  });

  test('leaderboard screen loads content', async ({ page }) => {
    await page.goto('http://localhost:8081/(screens)/social/leaderboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: screenshotPath('sub-leaderboard'), fullPage: true });
    await expect(page).toHaveURL(/social\/leaderboard/);
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).not.toContain('404');
  });

  test('challenges screen loads content', async ({ page }) => {
    await page.goto('http://localhost:8081/(screens)/social/challenges');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: screenshotPath('sub-challenges'), fullPage: true });
    await expect(page).toHaveURL(/social\/challenges/);
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).not.toContain('404');
  });

  test('search screen loads content', async ({ page }) => {
    await page.goto('http://localhost:8081/(screens)/social/search');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: screenshotPath('sub-search'), fullPage: true });
    await expect(page).toHaveURL(/social\/search/);
    const pageText = await page.evaluate(() => document.body.innerText);
    expect(pageText).not.toContain('404');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Final summary — print all accumulated console errors
// ─────────────────────────────────────────────────────────────────────────────

test.afterAll(async () => {
  const reportPath = path.join(SCREENSHOT_DIR, 'console-errors.json');
  fs.writeFileSync(reportPath, JSON.stringify(consoleErrors, null, 2));

  if (consoleErrors.length > 0) {
    console.log('\n===== CONSOLE ERRORS CAPTURED =====');
    const grouped: Record<string, number> = {};
    for (const e of consoleErrors) {
      const key = `[${e.type}] ${e.text.slice(0, 120)}`;
      grouped[key] = (grouped[key] || 0) + 1;
    }
    for (const [msg, count] of Object.entries(grouped)) {
      console.log(`  x${count}: ${msg}`);
    }
    console.log(`Full errors saved: ${reportPath}`);
  } else {
    console.log('\nNo console errors captured during test run.');
  }
});
