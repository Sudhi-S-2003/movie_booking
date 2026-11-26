import type { Request, Response } from 'express';
import { UrlPreviewService } from '../services/urlPreview.service.js';
import { UnsafeUrlError, assertPublicUrl } from '../utils/safeFetch.util.js';
import { catchAsync } from '../utils/catchAsync.js';
import { meterOrReject } from '../modules/billing/meter.js';
import { SERVICE_KEYS } from '../modules/catalog/catalog.registry.js';

/**
 * GET /api/url/preview?url=...
 * Authenticated, metered per preview, and fetched through the SSRF-safe
 * fetcher (private / internal hosts are rejected).
 */
export const getUrlPreview = catchAsync(async (req: Request, res: Response) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string' || url.length > 2048) {
    return res.status(400).json({ success: false, message: 'URL query parameter is required' });
  }
  try {
    await assertPublicUrl(url);
  } catch (err) {
    if (err instanceof UnsafeUrlError) return res.status(400).json({ success: false, message: err.message });
    return res.status(400).json({ success: false, message: 'Could not resolve host' });
  }

  const metered = await meterOrReject(res, {
    user: req.user!, serviceKey: SERVICE_KEYS.URL_PREVIEW, units: 1, description: 'URL preview',
  });
  if (!metered) return;

  try {
    const metadata = await UrlPreviewService.getMetadata(url);
    res.status(200).json({ success: true, data: metadata });
  } catch (err) {
    if (err instanceof UnsafeUrlError) return res.status(400).json({ success: false, message: err.message });
    throw err;
  }
});
