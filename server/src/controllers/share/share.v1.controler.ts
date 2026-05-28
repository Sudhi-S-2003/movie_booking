import type { NextFunction, Response, Request } from "express";
import errorService from "../../services/error/error.service.js";
import ShareV1Service from "../../services/share/share.v1.service.js";

const shareV1Service = new ShareV1Service();

import { guardTokens } from '../../services/subscription/tokenGuard.js';

export const createV1Share = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = req.body;
    if (!data) {
      throw errorService.badRequest("data is required");
    }

    // Attempt to meter tokens if user is authenticated
    const user = (req as any).user;
    if (user) {
      const tokenOutcome = await guardTokens(String(user._id), JSON.stringify(data), res, {
        description: 'CodeShare V1 Publication',
      });
      if (!tokenOutcome) return; // 402 already written by guardTokens
    }

    const share = await shareV1Service.createShare(data);

    return res.status(201).json({
      success: true,
      data: share,
    });
  } catch (error) {
    next(error);
  }
};

export const getV1Share = async (req: Request, res: Response, next: NextFunction) => {


  try {

    const { publicId } = req.params;

    if (!publicId || typeof publicId !== "string") {
      throw errorService.badRequest(
        "publicId is required"
      );
    }

    const share = await shareV1Service.getShare(publicId);

    if (!share) {
      throw errorService.notFound(
        "share not found"
      );
    }

    return res.redirect(share.data);

  } catch (error) {

    next(error);

  }

};