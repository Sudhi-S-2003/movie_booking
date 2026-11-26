import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, 'Username must be 3-30 characters: letters, numbers or underscores');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  username: usernameSchema,
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: passwordSchema,
  resellerCode: z.string().trim().max(40).optional(),
  captchaText: z.string().min(1, 'Captcha is required'),
  captchaToken: z.string().min(1, 'Captcha is required'),
});
export type RegisterInput = z.infer<typeof registerSchema>;
