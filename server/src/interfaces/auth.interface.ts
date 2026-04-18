import type { Request } from 'express';
import type { HydratedDocument } from 'mongoose';
import type { IUser } from './models.interface.js';

/**
 * AuthUser — the shape of `req.user` after the auth middleware runs.
 *
 * It's the hydrated Mongoose document so controllers can call model methods
 * (`.save()`, virtuals, etc.) without casting. Adding `_id` explicitly keeps
 * TypeScript happy since HydratedDocument's `_id` is `unknown` by default.
 */
export type AuthUser = HydratedDocument<IUser> & { _id: unknown };

/**
 * Global Express.Request augmentation.
 *
 * Declaring `user?: AuthUser` at the module level means every `req: Request`
 * in the codebase — including handlers passed to `router.get(...)` — can
 * read `req.user` without casting. Routes stay assignable to Express's
 * `RequestHandler` type (no contravariant mismatch from narrowing `req`).
 *
 * The field is optional because anonymous requests exist; handlers mounted
 * behind `isAuthenticated` should narrow via `req.user!` or `requireAuthUser`.
 */
/**
 * Signed-URL guest identity, attached by `isChatSignatureValid`.
 *
 * Unlike `user`, this is NOT a registered account — it's whatever lives on
 * `conversation.externalUser` when the signed link was generated. We put it
 * on the request so guest-facing controllers can access it without casting.
 */
export interface ExternalUserIdentity {
  name:   string;
  email?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?:         AuthUser;
      externalUser?: ExternalUserIdentity;
    }
  }
}

/**
 * AuthRequest — alias for Express Request. Keeps existing imports working,
 * and signals to readers "this handler expects req.user to be populated".
 * Narrow with `requireAuthUser(req)` inside the handler when you need a
 * non-null user.
 */
export type AuthRequest = Request;

/**
 * Narrow `req.user` to a non-null AuthUser, throwing if it's missing.
 * Use at the top of any handler mounted behind `isAuthenticated` — the
 * middleware guarantees presence, this just convinces TypeScript.
 */
export const requireAuthUser = (req: Request): AuthUser => {
  if (!req.user) {
    throw new Error('requireAuthUser called on an unauthenticated request');
  }
  return req.user;
};

/**
 * Shape of the payload we sign into JWTs.
 * Keep this narrow — PII shouldn't live in the token.
 */
export interface JwtPayload {
  id: string;
  role: string;
}
