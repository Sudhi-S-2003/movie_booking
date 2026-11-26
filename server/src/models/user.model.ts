import mongoose, { Schema, type Query, type UpdateQuery } from 'mongoose';
import type { IUser } from '../interfaces/models.interface.js';
import { UserRole, UserStatus, AuthProvider } from '../constants/enums.js';
import { PROTECTED_FIELDS } from '../modules/access/access.constants.js';
import { isSystemContext, ProtectedRecordError } from '../db/systemContext.js';

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: {
      type: String,
      required: function (this: IUser) { return this.authProvider === AuthProvider.LOCAL; },
      select: false,
    },
    phoneNumber: { type: String, trim: true },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.USER, index: true },
    status: { type: String, enum: Object.values(UserStatus), default: UserStatus.ACTIVE, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    ancestors: { type: [Schema.Types.ObjectId], default: [], index: true },
    isProtected: { type: Boolean, default: false },
    permissions: { type: [String], default: [] },
    resellerCode: { type: String, trim: true, lowercase: true },
    brandName: { type: String, trim: true, maxlength: 80 },
    suspendedReason: { type: String, maxlength: 500 },
    authProvider: { type: String, enum: Object.values(AuthProvider), default: AuthProvider.LOCAL },
    twoFactorSecret: { type: String, select: false },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorBackupCodes: { type: [String], select: false },
    avatar: { type: String },
    googleId: { type: String },
    managedTheatres: [{ type: Schema.Types.ObjectId, ref: 'Theatre' }],
    bio: { type: String, default: '', maxlength: 500 },
    coverImageUrl: { type: String },
    location: { type: String, trim: true },
    website: { type: String, trim: true },
    pronouns: { type: String, trim: true },
    socialLinks: [{ _id: false, platform: { type: String, required: true }, url: { type: String, required: true } }],
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    postCount: { type: Number, default: 0 },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

UserSchema.index({ resellerCode: 1 }, { unique: true, partialFilterExpression: { resellerCode: { $type: 'string' } } });
UserSchema.index({ parentId: 1, createdAt: -1 });

// ─── Protected-account guards (data layer) ──────────────────────────────────
// Service-level checks are the first line of defence; these hooks are the
// backstop. Outside `runAsSystem`, protected accounts can't be deleted and
// their restricted fields (role, status, hierarchy, permissions, email,
// protection flag) can't be changed — by any code path.

const RESTRICTED = new Set<string>(PROTECTED_FIELDS);

/** Collect top-level field names an update document touches. */
const touchedFields = (update: UpdateQuery<IUser> | null | undefined): string[] => {
  if (!update) return [];
  const fields: string[] = [];
  for (const [key, value] of Object.entries(update)) {
    if (key.startsWith('$')) {
      if (value && typeof value === 'object') fields.push(...Object.keys(value).map((k) => k.split('.')[0]!));
    } else {
      fields.push(key.split('.')[0]!);
    }
  }
  return fields;
};

UserSchema.pre('save', function () {
  if (isSystemContext()) return;
  if (this.isNew) {
    if (this.isProtected) throw new ProtectedRecordError('Protected accounts can only be created by the system bootstrap');
    if (this.role === UserRole.SUPER_ADMIN) throw new ProtectedRecordError('Super admin can only be created by the system bootstrap');
    return;
  }
  const wasProtected = this.isProtected || this.isModified('isProtected');
  if (this.isModified('isProtected')) throw new ProtectedRecordError('Protection flag can only be changed by the system');
  if (this.isModified('role') && this.role === UserRole.SUPER_ADMIN) {
    throw new ProtectedRecordError('Super admin role can only be assigned by the system bootstrap');
  }
  if (wasProtected && [...RESTRICTED].some((f) => this.isModified(f))) throw new ProtectedRecordError();
});

const guardUpdate = function (this: Query<unknown, IUser>) {
  if (isSystemContext()) return;
  const update = this.getUpdate() as UpdateQuery<IUser> | null;
  const fields = touchedFields(update);
  if (fields.includes('isProtected')) throw new ProtectedRecordError('Protection flag can only be changed by the system');
  const setsSuperAdmin = JSON.stringify(update ?? {}).includes(`"${UserRole.SUPER_ADMIN}"`) && fields.includes('role');
  if (setsSuperAdmin) throw new ProtectedRecordError('Super admin role can only be assigned by the system bootstrap');
  if (fields.some((f) => RESTRICTED.has(f))) {
    // Silently exclude protected accounts from restricted bulk updates.
    this.where({ isProtected: { $ne: true } });
  }
};

const guardDelete = function (this: Query<unknown, IUser>) {
  if (isSystemContext()) return;
  this.where({ isProtected: { $ne: true } });
};

UserSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne'], guardUpdate);
UserSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete'], { query: true, document: false }, guardDelete);
UserSchema.pre('deleteOne', { document: true, query: false }, function () {
  if (!isSystemContext() && this.isProtected) throw new ProtectedRecordError();
});

export const User = mongoose.model<IUser>('User', UserSchema);
