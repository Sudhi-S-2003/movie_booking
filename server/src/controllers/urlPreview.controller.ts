import  type { Request, Response } from 'express';
import { UrlPreviewService } from '../services/urlPreview.service.js';
import { catchAsync } from '../utils/catchAsync.js';

/**
 * GET /api/url/preview?url=...
 * Fetches metadata for a given URL for link previews.
 */
export const getUrlPreview = catchAsync(async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'URL query parameter is required',
    });
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid URL provided',
    });
  }

  const metadata = await UrlPreviewService.getMetadata(url);

  res.status(200).json({
    success: true,
    data: metadata,
  });
});
