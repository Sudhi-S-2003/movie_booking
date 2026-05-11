import { z } from 'zod';

/**
 * Environment variable schema for the client.
 * All variables must be prefixed with VITE_ to be exposed by Vite.
 */
const envSchema = z.object({
  VITE_BASE_URL: z.string().url().default('http://localhost:5000'),
  VITE_APP_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Parse the environment variables from import.meta.env
const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

/**
 * Validated environment variables.
 * VITE_API_URL and VITE_SOCKET_URL are derived from VITE_BASE_URL.
 */
export const env = {
  ...parsed.data,
  VITE_API_URL: `${parsed.data.VITE_BASE_URL}/api`,
  VITE_SOCKET_URL: parsed.data.VITE_BASE_URL,
} as const;

export type Env = typeof env;
