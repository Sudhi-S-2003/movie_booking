/**
 * Dev/test helper: sign in through the real /api/auth/login endpoint by
 * minting a known-answer captcha challenge server-side. Prints the auth
 * payload as JSON. Refuses to run in production.
 *   tsx scripts/dev-login.ts <identifier> [password]   (password defaults to SUPER_ADMIN_PASSWORD)
 */
import mongoose from 'mongoose';
import { env } from '../src/env.js';
import { createCaptchaToken } from '../src/utils/captcha.utils.js';

if (env.NODE_ENV === 'production') throw new Error('dev-login is disabled in production');
const [identifier = env.SUPER_ADMIN_EMAIL, password = env.SUPER_ADMIN_PASSWORD] = process.argv.slice(2);

await mongoose.connect(env.MONGODB_URI);
const captchaToken = await createCaptchaToken('DEVX');
const res = await fetch(`http://127.0.0.1:${env.PORT}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ identifier, password, captchaText: 'DEVX', captchaToken }),
});
console.log(JSON.stringify(await res.json()));
await mongoose.disconnect();
