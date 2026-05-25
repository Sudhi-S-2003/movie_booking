import type { Document } from "mongoose";

export interface IShare extends Document {
    publicId: string;
    version: "v1" | "v2";
    data: string;
}
