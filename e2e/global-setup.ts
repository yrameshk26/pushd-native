/**
 * Playwright global setup.
 *
 * Strategy (in priority order):
 *  1. If E2E_EMAIL + E2E_PASSWORD are set in env → login with those.
 *  2. If a credentials file exists (.auth/creds.json) → login with saved creds.
 *  3. Otherwise register a new account via mail.tm OTP and persist the creds.
 *
 * JWT tokens are saved to .auth/tokens.json for use by tests.
 * Credentials (.auth/creds.json) are NOT deleted by teardown so the same
 * account is reused on every run (avoids the registration rate limit).
 */
import * as fs from 'fs';
import * as path from 'path';

// Load .env.e2e file if present (gitignored — put E2E_EMAIL and E2E_PASSWORD there)
const envFile = path.join(__dirname, '..', '.env.e2e');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) process.env[k.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
  }
}

const PUSHD_API = 'https://pushd.fit/api';
const MAILTM_API = 'https://api.mail.tm';
const AUTH_DIR = path.join(__dirname, '.auth');
const TOKENS_FILE = path.join(AUTH_DIR, 'tokens.json');
const CREDS_FILE = path.join(AUTH_DIR, 'creds.json');

// ─── mail.tm helpers ─────────────────────────────────────────────────────────

async function getMailTmDomain(): Promise<string> {
  const res = await fetch(`${MAILTM_API}/domains?page=1`);
  const body = await res.json();
  const domains: { domain: string }[] = body['hydra:member'] ?? [];
  if (!domains.length) throw new Error('No mail.tm domains available');
  return domains[0].domain;
}

async function getOrCreateMailbox(address: string, password: string): Promise<string> {
  // Try to get a token for an existing mailbox first
  const tokenRes = await fetch(`${MAILTM_API}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password }),
  });
  if (tokenRes.ok) {
    const { token } = await tokenRes.json();
    return token as string;
  }

  // Create mailbox if it doesn't exist
  const createRes = await fetch(`${MAILTM_API}/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password }),
  });
  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`mail.tm account creation failed (${createRes.status}): ${err}`);
  }

  const retryRes = await fetch(`${MAILTM_API}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password }),
  });
  const { token } = await retryRes.json();
  return token as string;
}

async function waitForOtp(mailToken: string, timeoutMs = 60000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  // Delete existing messages so we don't pick up a stale OTP
  const listRes = await fetch(`${MAILTM_API}/messages`, {
    headers: { Authorization: `Bearer ${mailToken}` },
  });
  const existing = (await listRes.json())['hydra:member'] ?? [];
  for (const msg of existing) {
    await fetch(`${MAILTM_API}/messages/${msg.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${mailToken}` },
    });
  }

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`${MAILTM_API}/messages`, {
      headers: { Authorization: `Bearer ${mailToken}` },
    });
    const messages: { id: string }[] = (await res.json())['hydra:member'] ?? [];
    if (messages.length > 0) {
      const msgRes = await fetch(`${MAILTM_API}/messages/${messages[0].id}`, {
        headers: { Authorization: `Bearer ${mailToken}` },
      });
      const msg = await msgRes.json();
      const text: string = msg.text ?? msg.html ?? '';
      const match = text.match(/\b(\d{6})\b/);
      if (match) return match[1];
    }
  }
  throw new Error('OTP email not received within timeout');
}

// ─── pushd.fit helpers ───────────────────────────────────────────────────────

async function tryLogin(email: string, password: string): Promise<string | null> {
  const res = await fetch(`${PUSHD_API}/auth/pre-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body.preAuthToken ?? null;
}

async function register(email: string, password: string, username: string) {
  const res = await fetch(`${PUSHD_API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username, displayName: 'E2E Test User' }),
  });
  const text = await res.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text.trim()) as Record<string, unknown>;
  } catch {
    throw new Error(`Register failed (${res.status}): non-JSON response: ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(`Register failed (${res.status}): ${JSON.stringify(body)}`);
  return body as { sessionId?: string; preAuthToken?: string; emailPending?: boolean };
}

async function verifyEmail(sessionId: string, code: string): Promise<string> {
  const res = await fetch(`${PUSHD_API}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, code }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Email verification failed (${res.status}): ${JSON.stringify(body)}`);
  return body.preAuthToken as string;
}

async function exchangeTokens(preAuthToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await fetch(`${PUSHD_API}/auth/native/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preAuthToken }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${JSON.stringify(body)}`);
  return { accessToken: body.access_token, refreshToken: body.refresh_token };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default async function globalSetup() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  let email: string;
  let password: string;
  let preAuthToken: string | null = null;

  // ── Option A: use explicit env vars ────────────────────────────────────────
  if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) {
    email = process.env.E2E_EMAIL;
    password = process.env.E2E_PASSWORD;
    console.log(`\n🔑 E2E_EMAIL from env: ${email}`);
    preAuthToken = await tryLogin(email, password);
    if (!preAuthToken) throw new Error(`Login failed for E2E_EMAIL=${email}`);

  // ── Option B: reuse previously registered account ─────────────────────────
  } else if (fs.existsSync(CREDS_FILE)) {
    const creds = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
    email = creds.email;
    password = creds.password;
    console.log(`\n♻️  Reusing test account: ${email}`);
    preAuthToken = await tryLogin(email, password);
    if (!preAuthToken) {
      console.log('   Login failed — account may need re-registration');
      fs.unlinkSync(CREDS_FILE);
    }
  }

  // ── Option C: register a new account via mail.tm ──────────────────────────
  if (!preAuthToken) {
    const mailPassword = 'MailTm123!';
    console.log('\n📧 Getting disposable email from mail.tm...');
    const domain = await getMailTmDomain();

    // Use a stable mailbox name (not timestamp-based) so we can reuse it
    email = `pushd-e2e@${domain}`;
    password = 'E2eTest123!';
    // Use a fixed username; if taken the register endpoint returns 409 which we handle below
    const username = 'e2eplaywright';

    // First try login — the account may already exist from a previous run on this domain
    console.log(`🔑 Trying login for ${email} before registering...`);
    preAuthToken = await tryLogin(email, password);

    if (!preAuthToken) {
      const mailToken = await getOrCreateMailbox(email, mailPassword);

      console.log(`📝 Registering ${email} on pushd.fit...`);
      let regResult: { sessionId?: string; preAuthToken?: string; emailPending?: boolean };
      try {
        regResult = await register(email, password, username);
      } catch (err) {
        const errMsg = String(err);
        if (errMsg.includes('429')) {
          console.error('\n⛔ Registration rate-limited (5 accounts/IP/24h).');
          console.error('   Fix: create a pushd.fit account manually and add credentials to .env.e2e:');
          console.error('     E2E_EMAIL=your-email@example.com');
          console.error('     E2E_PASSWORD=YourPassword123!');
          console.error('   See .env.e2e.example for the template.\n');
        }
        // Username might be taken — retry with a unique one
        const uniqueUsername = `e2etest${Date.now()}`;
        console.log(`   Retrying with username ${uniqueUsername}: ${errMsg}`);
        regResult = await register(email, password, uniqueUsername);
      }

      if (regResult.preAuthToken) {
        preAuthToken = regResult.preAuthToken;
      } else if (regResult.sessionId) {
        console.log('📬 Waiting for OTP email...');
        const otp = await waitForOtp(mailToken);
        console.log(`🔓 OTP: ${otp}`);
        preAuthToken = await verifyEmail(regResult.sessionId, otp);
      } else {
        throw new Error(`Unexpected register response: ${JSON.stringify(regResult)}`);
      }
    }

    // Persist credentials for future runs
    fs.writeFileSync(CREDS_FILE, JSON.stringify({ email, password }, null, 2));
  }

  const { accessToken, refreshToken } = await exchangeTokens(preAuthToken!);

  fs.writeFileSync(
    TOKENS_FILE,
    JSON.stringify({ email, password, accessToken, refreshToken }, null, 2),
  );

  console.log(`✅ E2E session ready: ${email}\n`);
}
