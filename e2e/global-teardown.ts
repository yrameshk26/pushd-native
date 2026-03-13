/**
 * Playwright global teardown.
 * Removes JWT tokens (they expire anyway) but KEEPS creds.json so the same
 * test account is reused on the next run (avoids the registration rate limit).
 */
import * as fs from 'fs';
import * as path from 'path';

const TOKENS_FILE = path.join(__dirname, '.auth/tokens.json');

export default async function globalTeardown() {
  if (fs.existsSync(TOKENS_FILE)) fs.unlinkSync(TOKENS_FILE);
}
