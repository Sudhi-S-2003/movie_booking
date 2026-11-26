import bcrypt from 'bcryptjs';
import { env } from '../../env.js';
import { User } from '../../models/user.model.js';
import { AuthProvider, UserRole, UserStatus } from '../../constants/enums.js';
import { runAsSystem } from '../../db/systemContext.js';

/**
 * Ensure the platform owner exists as a protected super admin.
 *
 * Driven only by `SUPER_ADMIN_EMAIL` (and `SUPER_ADMIN_PASSWORD` on first
 * creation). There is no API to create or promote a super admin, and the
 * user model's data-layer hooks reject any such write outside this
 * system context. Re-running is idempotent and re-asserts protection, so
 * even a manual DB edit that weakens the account is undone on restart.
 */
export const bootstrapSuperAdmin = async (): Promise<void> => {
  const email = env.SUPER_ADMIN_EMAIL?.toLowerCase();
  if (!email) {
    console.warn('⚠️  SUPER_ADMIN_EMAIL is not set — no protected super admin is configured.');
    return;
  }

  await runAsSystem('super-admin bootstrap', async () => {
    const existing = await User.findOne({ email });
    if (existing) {
      existing.role = UserRole.SUPER_ADMIN;
      existing.status = UserStatus.ACTIVE;
      existing.isProtected = true;
      existing.parentId = null;
      existing.ancestors = [];
      if (!existing.resellerCode) existing.resellerCode = 'platform';
      await existing.save();
      console.log(`🛡️  Super admin protected: ${email}`);
      return;
    }

    if (!env.SUPER_ADMIN_PASSWORD) {
      console.error('❌ SUPER_ADMIN_PASSWORD is required to create the super admin on first run.');
      return;
    }
    const username = email.split('@')[0]!.replace(/[^a-z0-9_]/g, '_').slice(0, 24) || 'owner';
    await User.create({
      name: env.SUPER_ADMIN_NAME,
      username: (await User.exists({ username })) ? `${username}_owner` : username,
      email,
      password: await bcrypt.hash(env.SUPER_ADMIN_PASSWORD, 12),
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isProtected: true,
      parentId: null,
      ancestors: [],
      resellerCode: 'platform',
      authProvider: AuthProvider.LOCAL,
    });
    console.log(`🛡️  Super admin created: ${email}`);
  });
};
