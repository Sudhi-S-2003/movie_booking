import crypto from "crypto";
import type { Types } from "mongoose";
import Share from "../../models/share.model.js";

/** Only web URLs may be shared — blocks javascript:, data:, file: and similar schemes. */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const MAX_TTL_DAYS = 365;

class ShareV1Service {
  generatePublicId = (): string => crypto.randomBytes(12).toString("base64url");

  isValidUrl = (value: string): boolean => {
    try {
      const url = new URL(value);
      return ALLOWED_PROTOCOLS.has(url.protocol) && value.length <= 2048;
    } catch {
      return false;
    }
  };

  createShare = async (data: string, ownerId: Types.ObjectId | string, ttlDays?: number) => {
    if (!this.isValidUrl(data)) throw new Error("Invalid URL: only http(s) links up to 2048 characters are allowed");
    const days = typeof ttlDays === "number" && ttlDays > 0 ? Math.min(ttlDays, MAX_TTL_DAYS) : undefined;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await Share.create({
          version: "v1",
          publicId: this.generatePublicId(),
          data,
          ownerId,
          ...(days ? { expiresAt: new Date(Date.now() + days * 86_400_000) } : {}),
        });
      } catch (error: unknown) {
        if ((error as { code?: number })?.code === 11000) continue;
        throw error;
      }
    }
    throw new Error("Failed to generate unique publicId");
  };

  getShare = async (publicId: string) => {
    const share = await Share.findOne({ publicId, version: "v1" });
    if (!share) return null;
    if (share.expiresAt && share.expiresAt.getTime() < Date.now()) return null;
    return share;
  };

  listOwned = (ownerId: Types.ObjectId | string) =>
    Share.find({ ownerId, version: "v1" }).sort({ createdAt: -1 }).limit(200).lean();

  deleteOwned = (ownerId: Types.ObjectId | string, publicId: string) =>
    Share.deleteOne({ ownerId, publicId, version: "v1" });
}

export default ShareV1Service;
