import { test, expect } from '@playwright/test';

/**
 * Auth flows: login, register, forgot password, verify email.
 *
 * Key notes about React Native Web / Expo Router rendering:
 * - Multiple screens can be in the DOM simultaneously (stack navigation)
 * - Elements from hidden screens have visibility:hidden or are offscreen
 * - Use `{ exact: true }` to avoid strict mode violations with similar text
 * - Use `.first()` or filter by visible when multiple matches exist
 */

// ─── Login screen ─────────────────────────────────────────────────────────────

test.describe('Login screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for login page to load — check for the email placeholder
    await page.waitForSelector('[placeholder="you@example.com"]', { timeout: 15000 });
  });

  test('shows login page title', async ({ page }) => {
    await expect(page.getByText('Pushd').first()).toBeVisible();
    await expect(page.getByText('Sign in to your account').first()).toBeVisible();
  });

  test('shows email input', async ({ page }) => {
    await expect(page.getByPlaceholder('you@example.com').first()).toBeVisible();
  });

  test('shows password input', async ({ page }) => {
    await expect(page.getByPlaceholder('Password')).toBeVisible();
  });

  test('shows Continue button (exact match)', async ({ page }) => {
    // Use exact match to avoid matching "Continue with Google"
    await expect(page.getByText('Continue', { exact: true }).first()).toBeVisible();
  });

  test('shows Forgot password link', async ({ page }) => {
    await expect(page.getByText('Forgot password?').first()).toBeVisible();
  });

  test('shows Register link', async ({ page }) => {
    await expect(page.getByText('Register').first()).toBeVisible();
  });

  test('email field accepts input', async ({ page }) => {
    const emailInput = page.getByPlaceholder('you@example.com').first();
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('password field accepts input', async ({ page }) => {
    const passwordInput = page.getByPlaceholder('Password');
    await passwordInput.fill('TestPass123!');
    await expect(passwordInput).toHaveValue('TestPass123!');
  });

  test('Continue button triggers login attempt with valid inputs', async ({ page }) => {
    await page.getByPlaceholder('you@example.com').first().fill('user@test.com');
    await page.getByPlaceholder('Password').fill('password123');
    const continueBtn = page.getByText('Continue', { exact: true }).first();
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();
    // App either navigates or shows error — both are valid
    await page.waitForTimeout(2000);
  });

  test('empty form does not crash — button still present', async ({ page }) => {
    // With empty fields, clicking Continue should not navigate away
    await page.getByText('Continue', { exact: true }).first().click();
    // Still see the email input
    await expect(page.getByPlaceholder('you@example.com').first()).toBeVisible();
  });

  test('navigates to forgot password screen', async ({ page }) => {
    await page.getByText('Forgot password?').first().click();
    await page.waitForURL(/forgot-password/, { timeout: 10000 });
    await expect(page.getByText('Send Reset Link').first()).toBeVisible();
  });

  test('navigates to register screen', async ({ page }) => {
    await page.getByText('Register').first().click();
    await page.waitForURL(/register/, { timeout: 10000 });
    // The register page title is "Create account"
    await expect(page.getByText('Sign up to start training smarter').first()).toBeVisible();
  });
});

// ─── Register screen ──────────────────────────────────────────────────────────

test.describe('Register screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[placeholder="you@example.com"]', { timeout: 15000 });
    await page.getByText('Register').first().click();
    await page.waitForURL(/register/, { timeout: 10000 });
    // Wait for register-specific content
    await page.waitForSelector('[placeholder="John Doe"]', { timeout: 10000 });
  });

  test('shows registration subtitle', async ({ page }) => {
    await expect(page.getByText('Sign up to start training smarter').first()).toBeVisible();
  });

  test('shows email field', async ({ page }) => {
    // Two email fields exist — login screen (hidden, first in DOM) and register screen (visible, last)
    const emailInputs = page.getByPlaceholder('you@example.com');
    await expect(emailInputs.last()).toBeVisible();
  });

  test('shows display name field', async ({ page }) => {
    await expect(page.getByPlaceholder('John Doe')).toBeVisible();
  });

  test('shows username field', async ({ page }) => {
    await expect(page.getByPlaceholder('johndoe')).toBeVisible();
  });

  test('shows password field', async ({ page }) => {
    await expect(page.getByPlaceholder('••••••••').first()).toBeVisible();
  });

  test('shows Create Account button', async ({ page }) => {
    await expect(page.getByText('Create Account', { exact: true }).first()).toBeVisible();
  });

  test('email field accepts input', async ({ page }) => {
    // The register screen is on top of the stack — its email input is last in DOM
    const emailInput = page.getByPlaceholder('you@example.com').last();
    await emailInput.fill('newuser@example.com');
    await expect(emailInput).toHaveValue('newuser@example.com');
  });

  test('shows password strength indicators when typing', async ({ page }) => {
    const pwInput = page.getByPlaceholder('••••••••').first();
    await pwInput.fill('abc');
    await expect(page.getByText('8+ characters').first()).toBeVisible();
    await expect(page.getByText('Uppercase letter').first()).toBeVisible();
    await expect(page.getByText('Lowercase letter').first()).toBeVisible();
    await expect(page.getByText('Number').first()).toBeVisible();
    await expect(page.getByText('Special character').first()).toBeVisible();
  });

  test('shows passwords do not match error', async ({ page }) => {
    const pwInputs = page.getByPlaceholder('••••••••');
    await pwInputs.first().fill('TestPass123!');
    await pwInputs.last().fill('DifferentPass!');
    await expect(page.getByText('Passwords do not match').first()).toBeVisible();
  });

  test('sign in link navigates back to login', async ({ page }) => {
    // Scroll to bottom of the register form to make the Sign in link visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    // The "Sign in" link is at the bottom of the register screen
    const signInLink = page.getByText('Sign in', { exact: true });
    await signInLink.scrollIntoViewIfNeeded();
    await signInLink.click({ timeout: 10000 });
    await page.waitForURL(/login/, { timeout: 10000 });
  });
});

// ─── Forgot password screen ───────────────────────────────────────────────────

test.describe('Forgot password screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[placeholder="you@example.com"]', { timeout: 15000 });
    await page.getByText('Forgot password?').first().click();
    await page.waitForURL(/forgot-password/, { timeout: 10000 });
    await page.waitForSelector('text=Send Reset Link', { timeout: 10000 });
  });

  test('shows forgot password heading', async ({ page }) => {
    // Login screen is still in DOM (hidden) — its "Forgot password?" link is first.
    // The visible heading on the forgot-password page is last in DOM.
    await expect(page.getByText('Forgot password?').last()).toBeVisible();
  });

  test('shows description text', async ({ page }) => {
    await expect(
      page.getByText("Enter your email and we'll send you a link to reset your password.").first(),
    ).toBeVisible();
  });

  test('shows email input', async ({ page }) => {
    // Login screen email input is hidden and first in DOM; forgot-password input is last
    await expect(page.getByPlaceholder('you@example.com').last()).toBeVisible();
  });

  test('shows Send Reset Link button', async ({ page }) => {
    await expect(page.getByText('Send Reset Link').first()).toBeVisible();
  });

  test('email field accepts input', async ({ page }) => {
    // Use last() to target the visible forgot-password email field
    const emailInput = page.getByPlaceholder('you@example.com').last();
    await emailInput.fill('forgot@example.com');
    await expect(emailInput).toHaveValue('forgot@example.com');
  });

  test('submitting shows success state (Check your inbox)', async ({ page }) => {
    await page.getByPlaceholder('you@example.com').last().fill('test@example.com');
    await page.getByText('Send Reset Link').first().click();
    // API always returns success (email enumeration prevention)
    await expect(page.getByText('Check your inbox').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Back to Login').first()).toBeVisible();
  });

  test('Back to Login navigates to login from success state', async ({ page }) => {
    await page.getByPlaceholder('you@example.com').last().fill('test@example.com');
    await page.getByText('Send Reset Link').first().click();
    await expect(page.getByText('Check your inbox').first()).toBeVisible({ timeout: 10000 });
    // Click the "Back to Login" button in the success state
    const backBtn = page.getByText('Back to Login').first();
    await backBtn.scrollIntoViewIfNeeded();
    await backBtn.click();
    // Expo Router's replace navigates to login
    await page.waitForURL(/login/, { timeout: 15000 });
  });
});

// ─── Verify email screen ──────────────────────────────────────────────────────

test.describe('Verify email screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/(auth)/verify-email?email=test%40example.com&sessionId=dummy-session');
    await page.waitForSelector('text=Verify your email', { timeout: 15000 });
  });

  test('shows verify email heading', async ({ page }) => {
    await expect(page.getByText('Verify your email').first()).toBeVisible();
  });

  test('shows we sent a code text', async ({ page }) => {
    await expect(page.getByText('We sent a 6-digit code to').first()).toBeVisible();
  });

  test('shows 6-digit code input', async ({ page }) => {
    await expect(page.getByPlaceholder('000000')).toBeVisible();
  });

  test('shows Verify Email button', async ({ page }) => {
    await expect(page.getByText('Verify Email').first()).toBeVisible();
  });

  test('code input accepts 6 digits', async ({ page }) => {
    const codeInput = page.getByPlaceholder('000000');
    await codeInput.fill('123456');
    await expect(codeInput).toHaveValue('123456');
  });

  test('shows resend link', async ({ page }) => {
    await expect(page.getByText("Didn't receive a code?").first()).toBeVisible();
    await expect(page.getByText('Resend').first()).toBeVisible();
  });
});
