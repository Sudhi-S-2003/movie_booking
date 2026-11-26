import mongoose, { Schema } from 'mongoose';

/**
 * Single-use captcha challenge. Only a keyed hash of the answer is stored;
 * the document is deleted atomically on the first verification attempt
 * (right or wrong), so a challenge can never be replayed or brute-forced.
 */
export interface ICaptchaChallenge {
  answerHash: string;
  /** Owner of the challenge when issued through the Auth service API. */
  ownerId?: mongoose.Types.ObjectId;
  expiresAt: Date;
}

const CaptchaChallengeSchema = new Schema<ICaptchaChallenge>({
  answerHash: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date, required: true },
});

CaptchaChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CaptchaChallenge = mongoose.model<ICaptchaChallenge>('CaptchaChallenge', CaptchaChallengeSchema);
