import { env } from './env.js';
import http from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import { initSocket } from './socket/index.js';
import { User } from './models/user.model.js';
import { Session } from './models/session.model.js';
import { syncCatalog } from './modules/catalog/entitlement.service.js';
import { bootstrapSuperAdmin } from './modules/platform/superAdmin.bootstrap.js';
import { ensureUnlimitedWallet } from './modules/billing/billingAccount.service.js';
import { UserRole } from './constants/enums.js';

const server = http.createServer(app);
initSocket(server);

/** One-time platform setup that must finish before serving traffic. */
const prepare = async () => {
  await mongoose.connection.syncIndexes();
  await syncCatalog();
  await bootstrapSuperAdmin();
  const root = await User.findOne({ role: UserRole.SUPER_ADMIN, isProtected: true }).select('_id');
  if (root) await ensureUnlimitedWallet(root._id);
  // Presence flags from a previous process are stale.
  await Promise.all([User.updateMany({}, { isOnline: false }), Session.updateMany({}, { isOnline: false })]);
};

mongoose
  .connect(env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    await prepare();
    server.listen(env.PORT, () => console.log(`🚀 Server running on port ${env.PORT}`));

    const shutdown = async () => {
      console.log('\n🔄 Shutting down...');
      server.close();
      await mongoose.disconnect();
      process.exit(0);
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  })
  .catch((err) => {
    console.error('❌ Startup failed:', err);
    process.exit(1);
  });
