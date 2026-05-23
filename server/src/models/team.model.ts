import mongoose, { Schema } from 'mongoose';

// ─── Team ───────────────────────────────────────────────────────────────────

export interface ITeam {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  publicName: string;
  type: 'agent' | 'team';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TeamDoc = mongoose.HydratedDocument<ITeam>;

const TeamSchema = new Schema<ITeam>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    publicName: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: { type: String, enum: ['agent', 'team'], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── TeamMember ─────────────────────────────────────────────────────────────

export interface ITeamMember {
  memberId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  isActive: boolean;
  joinedAt: Date;
}

export type TeamMemberDoc = mongoose.HydratedDocument<ITeamMember>;

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    isActive: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

TeamMemberSchema.index({ teamId: 1, memberId: 1 }, { unique: true });

export const Team = mongoose.model<ITeam>('Team', TeamSchema);
export const TeamMember = mongoose.model<ITeamMember>('TeamMember', TeamMemberSchema);
