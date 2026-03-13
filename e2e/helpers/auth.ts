import { Page } from '@playwright/test';

/**
 * The app stores the access token directly in localStorage under this key
 * (see src/utils/storage.ts — on web it falls back from SecureStore to localStorage).
 */
export const TOKEN_STORAGE_KEY = 'pushd_access_token';

/**
 * Inject a fake access token into localStorage so the Zustand auth store
 * believes the user is authenticated when hydrate() is called.
 *
 * We then reload the page so the store picks it up, and wait until the app
 * has redirected away from the auth screens.
 */
export async function injectAuthState(page: Page): Promise<void> {
  // Navigate to the root first so we are on the same origin
  await page.goto('http://localhost:8081/');

  await page.evaluate((key) => {
    // A non-empty string is enough — hydrate() only checks !!token
    localStorage.setItem(key, 'e2e-fake-access-token');
  }, TOKEN_STORAGE_KEY);

  // Reload so the app re-hydrates from storage
  await page.reload();
}

/**
 * Clear auth state so the app returns to the unauthenticated flow.
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate((key) => {
    localStorage.removeItem(key);
  }, TOKEN_STORAGE_KEY);
  await page.reload();
}

/**
 * Wait for the dashboard to be visible — used after injecting auth state.
 */
export async function waitForDashboard(page: Page): Promise<void> {
  // The dashboard shows "START WORKOUT" once loaded
  await page.waitForURL(/dashboard/, { timeout: 10000 });
}
