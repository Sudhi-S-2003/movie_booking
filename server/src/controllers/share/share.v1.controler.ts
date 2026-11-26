import type { NextFunction, Response, Request } from "express";
import errorService from "../../services/error/error.service.js";
import ShareV1Service from "../../services/share/share.v1.service.js";
import { meterOrReject } from "../../modules/billing/meter.js";
import { SERVICE_KEYS } from "../../modules/catalog/catalog.registry.js";

const shareV1Service = new ShareV1Service();

/** POST /api/share/v1 — create a link (authenticated, metered per link). */
export const createV1Share = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, ttlDays } = req.body ?? {};
    if (typeof data !== "string" || !data) throw errorService.badRequest("data is required");
    if (!shareV1Service.isValidUrl(data)) throw errorService.badRequest("Only http(s) links up to 2048 characters are allowed");

    const metered = await meterOrReject(res, { user: req.user!, serviceKey: SERVICE_KEYS.LINK_SHARE, units: 1, description: "Link Share: create link" });
    if (!metered) return;

    const share = await shareV1Service.createShare(data, req.user!._id as never, typeof ttlDays === "number" ? ttlDays : undefined);
    return res.status(201).json({ success: true, data: share });
  } catch (error) {
    next(error);
  }
};

export const listMyShares = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: await shareV1Service.listOwned(req.user!._id as never) });
  } catch (error) {
    next(error);
  }
};

export const deleteMyShare = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await shareV1Service.deleteOwned(req.user!._id as never, String(req.params.publicId));
    if (!result.deletedCount) throw errorService.notFound("share not found");
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
};

/** GET /api/share/v1/:publicId — public redirect. */
export const getV1Share = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { publicId } = req.params;
    if (!publicId || typeof publicId !== "string") throw errorService.badRequest("publicId is required");
    const share = await shareV1Service.getShare(publicId);
    // Re-validate on read so legacy rows with unsafe schemes never redirect.
    if (!share || !shareV1Service.isValidUrl(share.data)) throw errorService.notFound("share not found");
    return res.redirect(302, share.data);
  } catch (error) {
    next(error);
  }
};
