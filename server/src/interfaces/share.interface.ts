import type { Document, Types } from "mongoose";

export interface IShare extends Document {
    publicId: string;
    version: "v1" | "v2";
    /** Target URL (http/https only). */
    data: string;
    /** Account that created (and is billed for) the link. Legacy links have none. */
    ownerId?: Types.ObjectId;
    /** Optional expiry; expired links are removed by a TTL index. */
    expiresAt?: Date;
}
