import { z } from 'zod';
import { usernameSchema, passwordSchema } from '../auth/auth.schemas.js';
import { UserRole, UserStatus } from '../../constants/enums.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    phoneNumber: z.string().trim().max(30),
    avatar: z.string().trim().url().max(500),
    bio: z.string().max(500),
    brandName: z.string().trim().max(80),
  })
  .partial()
  .strict();

export const resellerApplicationSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  website: z.string().trim().url().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
});

export const listUsersQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(Object.values(UserRole) as [string, ...string[]]).optional(),
  status: z.enum(Object.values(UserStatus) as [string, ...string[]]).optional(),
  parentId: objectId.optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  username: usernameSchema,
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
  role: z.enum([UserRole.USER, UserRole.RESELLER]).default(UserRole.USER),
  /** Owning reseller; defaults to the creating actor (staff may choose). */
  parentId: objectId.nullable().optional(),
  serviceKeys: z.array(z.string().max(60)).max(100).optional(),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    phoneNumber: z.string().trim().max(30),
    brandName: z.string().trim().max(80),
    permissions: z.array(z.string().max(60)).max(50),
  })
  .partial()
  .strict();

export const suspendSchema = z.object({ reason: z.string().trim().min(3).max(500) });

export const changeRoleSchema = z.object({
  role: z.enum([UserRole.USER, UserRole.RESELLER, UserRole.ADMIN]),
  resellerCode: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,40}$/).optional(),
});

export const decideApplicationSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(1000).optional(),
  resellerCode: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,40}$/).optional(),
});

export const auditQuerySchema = z.object({
  action: z.string().max(60).optional(),
  targetId: z.string().max(60).optional(),
  actorId: objectId.optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
