import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export const ACCESS_TOKEN_KEY = 'pushd_access_token';
export const REFRESH_TOKEN_KEY = 'pushd_refresh_token';

const TOKENS_FILE = path.join(__dirname, '../.auth/tokens.json');

export interface StoredTokens {
  userId: string;
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
}

/** Read the tokens written by global-setup. Falls back to a fake token if not present. */
export function getStoredTokens(): StoredTokens {
  if (fs.existsSync(TOKENS_FILE)) {
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8')) as StoredTokens;
  }
  // Fallback (should only happen when running tests without global-setup)
  return {
    userId: '',
    email: '',
    password: '',
    accessToken: 'e2e-fake-access-token',
    refreshToken: '',
  };
}

/**
 * Inject real auth tokens into localStorage so the Zustand store
 * considers the user authenticated when the app hydrates.
 */
export async function injectAuthState(page: Page): Promise<void> {
  await page.goto('http://localhost:8081/');

  const { accessToken, refreshToken } = getStoredTokens();

  await page.evaluate(
    ([atKey, rtKey, at, rt]) => {
      localStorage.setItem(atKey, at);
      if (rt) localStorage.setItem(rtKey, rt);
    },
    [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, accessToken, refreshToken] as const,
  );

  await page.reload();
}

/** Clear auth state from localStorage. */
export async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate(([atKey, rtKey]) => {
    localStorage.removeItem(atKey);
    localStorage.removeItem(rtKey);
  }, [ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY] as const);
  await page.reload();
}

/** Wait until the dashboard is visible after injecting auth state. */
export async function waitForDashboard(page: Page): Promise<void> {
  await page.waitForURL(/dashboard/, { timeout: 10000 });
}
