// services/shareV1.service.ts

import crypto from "crypto";

import Share from "../../models/share.model.js";

class ShareV1Service {

  generatePublicId = (): string => {
    return crypto.randomBytes(12).toString("base64url");
  };

  isValidUrl = (value: string): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  createShare = async (data: string) => {

    // 1. validate URL first
    if (!this.isValidUrl(data)) {
      throw new Error("Invalid URL");
    }

    // 2. retry unique publicId safely
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const share = await Share.create({
          version: "v1",
          publicId: this.generatePublicId(),
          data,
        });

        return share;

      } catch (error: any) {

        // duplicate key error only
        if (error?.code === 11000) {
          continue;
        }

        throw error;
      }
    }

    throw new Error("Failed to generate unique publicId");
  };

  getShare = async (publicId: string) => {
    return await Share.findOne({ publicId ,version:"v1"});
  };
}

export default ShareV1Service;