import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const DEV_ONLY_SECRET = 'dev-only-insecure-secret-change-me-0000000000';

/**
 * Hosting dashboards often store blank or quoted values. Trim whitespace and
 * surrounding quotes, and treat an empty value as unset, so an empty optional
 * variable never crashes startup.
 */
const clean = (v: unknown) => {
  if (typeof v !== 'string') return v;
  const t = v.trim().replace(/^(['"])(.*)\1$/, '$2').trim();
  return t === '' ? undefined : t;
};
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(clean, schema.optional());

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/saas-platform'),
    /** Signs access JWTs. Must be >= 32 chars in production. */
    JWT_SECRET: z.string().min(1).default(DEV_ONLY_SECRET),
    /**
     * Separate key for HMAC-signed URLs, captcha challenges and webhook URLs,
     * so a leak of one key does not compromise the other. Falls back to a
     * value derived from JWT_SECRET when unset (see `signingKey`).
     */
    SIGNING_SECRET: optional(z.string()),
    JWT_EXPIRES_IN: z.string().default('15m'),
    FRONTEND_URL: z.string().url().default('http://localhost:5173'),
    /** Extra allowed CORS origins (comma separated), e.g. reseller white-label domains. */
    CORS_EXTRA_ORIGINS: z.string().default(''),
    API_URL: z.string().url().default('http://localhost:5000'),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    APP_NAME: z.string().default('Nexus Platform'),
    /** Number of reverse-proxy hops to trust for client IP (0 = none). */
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
    /** Protected super admin bootstrap. Created/protected on startup when set. */
    SUPER_ADMIN_EMAIL: optional(z.string().toLowerCase().email('must be a plain email address, without quotes')),
    SUPER_ADMIN_PASSWORD: optional(z.string().min(12, 'must be at least 12 characters')),
    SUPER_ADMIN_NAME: z.string().default('Platform Owner'),
    TELINFY_WEBHOOK_SECRET: optional(z.string()),
  })
  .superRefine((v, ctx) => {
    if (v.NODE_ENV === 'production') {
      if (v.JWT_SECRET === DEV_ONLY_SECRET || v.JWT_SECRET.length < 32) {
        ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'must be set to >= 32 random chars in production' });
      }
      if (v.SIGNING_SECRET !== undefined && v.SIGNING_SECRET.length < 32) {
        ctx.addIssue({ code: 'custom', path: ['SIGNING_SECRET'], message: 'must be >= 32 chars' });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;

if (env.NODE_ENV !== 'production' && env.JWT_SECRET === DEV_ONLY_SECRET) {
  console.warn('⚠️  Using development JWT secret. Set JWT_SECRET before deploying.');
}
