// models/Share.ts

import mongoose, { Model, Schema } from "mongoose";

import type { IShare } from "../interfaces/share.interface.js";

const ShareSchema: Schema<IShare> = new Schema(
  {
    publicId: {
      type: String,
      required: true,
      trim: true,
    },

    version: {
      type: String,
      required: true,
      enum: ["v1", "v2"],
      default: "v1",
    },

    data: {
      type: String,
      required: true,
      maxlength: 2048,
    },

    ownerId: { type: Schema.Types.ObjectId, ref: "User", index: true },

    expiresAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

ShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// compound unique index
ShareSchema.index(
  { publicId: 1, version: 1 },
  { unique: true }
);

const Share: Model<IShare> =
  mongoose.models.Share ||
  mongoose.model<IShare>("Share", ShareSchema);

export default Share;