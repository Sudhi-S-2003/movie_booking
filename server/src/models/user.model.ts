import mongoose, { Schema } from 'mongoose';
import type { IUser } from '../interfaces/models.interface.js';
import { UserRole, AuthProvider } from '../constants/enums.js';

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, sparse: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { 
      type: String, 
      required: function(this: IUser) { return this.authProvider === AuthProvider.LOCAL; },
      select: false // Hide password by default
    },
    phoneNumber: { type: String, trim: true },
    role: { 
      type: String, 
      enum: Object.values(UserRole), 
      default: UserRole.USER 
    },
    authProvider: { 
      type: String, 
      enum: Object.values(AuthProvider), 
      default: AuthProvider.LOCAL 
    },
    avatar: { type: String },
    googleId: { type: String },
    managedTheatres: [{ type: Schema.Types.ObjectId, ref: 'Theatre' }],
    bio: { type: String, default: '', maxlength: 500 },
    coverImageUrl: { type: String },
    location: { type: String, trim: true },
    website: { type: String, trim: true },
    pronouns: { type: String, trim: true },
    socialLinks: [
      {
        _id: false,
        platform: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    postCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
