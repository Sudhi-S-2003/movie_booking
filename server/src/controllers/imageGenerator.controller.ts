import type { Request, Response } from 'express';
import { imageGeneratorService } from '../services/imageGenerator.service.js';
import { getErrorMessage } from '../utils/error.utils.js';
import {
  AVATAR_THEME_NAMES,
  BADGE_THEME_NAMES,
  ICON_NAMES,
  SUPPORTED_FORMATS,
  SUPPORTED_SHAPES,
  SUPPORTED_BADGE_TYPES,
  AVATAR_MIN_SIZE,
  AVATAR_MAX_SIZE,
  AVATAR_DEFAULT_SIZE,
  BADGE_MIN_WIDTH,
  BADGE_MAX_WIDTH,
  BADGE_MIN_HEIGHT,
  BADGE_MAX_HEIGHT,
  BADGE_DEFAULT_HEIGHT,
} from '../constants/image/index.js';
import type { SupportedFormat, SupportedShape, SupportedBadgeType } from '../constants/image/index.js';

/**
 * Controller to handle dynamic avatar and badge image generation requests.
 */
export const getAvatar = async (req: Request, res: Response) => {
  try {
    // 1. Resolve raw identifier from path parameter or query strings
    let rawIdentifier = (req.params.identifier || req.query.name || req.query.seed || '').toString().trim();
    
    if (!rawIdentifier) {
      rawIdentifier = 'default';
    }

    try {
      rawIdentifier = decodeURIComponent(rawIdentifier);
    } catch {
      // ignore
    }
    rawIdentifier = rawIdentifier.replace(/\+/g, ' ');

    let format: SupportedFormat = 'png';
    let cleanName = rawIdentifier;

    // 2. Parse file extension from the end of identifier if present (e.g., "s.png" or "Sudh.webp")
    const extMatch = rawIdentifier.match(/\.(png|jpe?g|webp)$/i);
    if (extMatch && extMatch[1]) {
      const ext = extMatch[1].toLowerCase();
      const resolvedExt = ext === 'jpg' ? 'jpeg' : ext;
      if (SUPPORTED_FORMATS.includes(resolvedExt as SupportedFormat)) {
        format = resolvedExt as SupportedFormat;
      }
      cleanName = rawIdentifier.substring(0, rawIdentifier.lastIndexOf('.'));
    }

    // 3. Query string overrides (e.g. explicit &format=webp)
    if (req.query.format) {
      const qFormat = req.query.format.toString().toLowerCase();
      const normFormat = qFormat === 'jpg' ? 'jpeg' : qFormat;
      if (!SUPPORTED_FORMATS.includes(normFormat as SupportedFormat)) {
        return res.status(400).json({
          success: false,
          message: `Invalid format '${qFormat}'. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`
        });
      }
      format = normFormat as SupportedFormat;
    }

    let shape: SupportedShape = 'circle';
    if (req.query.shape) {
      const qShape = req.query.shape.toString().toLowerCase();
      if (!SUPPORTED_SHAPES.includes(qShape as SupportedShape)) {
        return res.status(400).json({
          success: false,
          message: `Invalid shape '${qShape}'. Supported shapes: ${SUPPORTED_SHAPES.join(', ')}`
        });
      }
      shape = qShape as SupportedShape;
    }

    let size = AVATAR_DEFAULT_SIZE;
    if (req.query.size) {
      const qSize = parseInt(req.query.size.toString(), 10);
      if (isNaN(qSize) || qSize < AVATAR_MIN_SIZE || qSize > AVATAR_MAX_SIZE) {
        return res.status(400).json({
          success: false,
          message: `Invalid size '${req.query.size}'. Size must be an integer between ${AVATAR_MIN_SIZE} and ${AVATAR_MAX_SIZE}.`
        });
      }
      size = qSize;
    }

    const theme = req.query.theme?.toString();
    if (theme) {
      const cleanTheme = theme.toLowerCase().trim();
      const isPreset = AVATAR_THEME_NAMES.includes(cleanTheme);
      const hex = cleanTheme.startsWith('#') ? cleanTheme : `#${cleanTheme}`;
      const isValidHex = /^#[0-9A-F]{6}$/i.test(hex);
      if (!isPreset && !isValidHex) {
        return res.status(400).json({
          success: false,
          message: `Invalid theme '${theme}'. Must be a hex color or one of the supported themes: ${AVATAR_THEME_NAMES.join(', ')}`
        });
      }
    }

    let len: number | undefined = undefined;
    if (req.query.len) {
      const qLen = parseInt(req.query.len.toString(), 10);
      if (qLen !== 1 && qLen !== 2) {
        return res.status(400).json({
          success: false,
          message: `Invalid len '${req.query.len}'. Initials length must be 1 or 2.`
        });
      }
      len = qLen;
    }

    // Explicit check if user wanted seed-based pattern generation instead of name initials
    const isSeedOnly = !!req.query.seed && !req.query.name && !req.params.identifier;

    // 4. Generate image buffer
    const buffer = await imageGeneratorService.generateAvatar({
      name: isSeedOnly ? undefined : cleanName,
      seed: isSeedOnly ? cleanName : undefined,
      size,
      format,
      shape,
      theme,
      len,
    });

    // 5. Send binary image with correct headers
    res.set('Content-Type', `image/${format}`);
    res.set('Cache-Control', 'public, max-age=604800'); // Cache for 7 days
    res.status(200).send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

export const getBadge = async (req: Request, res: Response) => {
  try {
    let rawText = (req.params.identifier || req.query.text || '').toString().trim();
    if (!rawText) {
      return res.status(400).json({ success: false, message: 'Badge text is required' });
    }

    try {
      rawText = decodeURIComponent(rawText);
    } catch {
      // ignore
    }
    rawText = rawText.replace(/\+/g, ' ');

    let format: SupportedFormat = 'png';
    let cleanText = rawText;

    // Parse extension
    const extMatch = rawText.match(/\.(png|jpe?g|webp)$/i);
    if (extMatch && extMatch[1]) {
      const ext = extMatch[1].toLowerCase();
      const resolvedExt = ext === 'jpg' ? 'jpeg' : ext;
      if (SUPPORTED_FORMATS.includes(resolvedExt as SupportedFormat)) {
        format = resolvedExt as SupportedFormat;
      }
      cleanText = rawText.substring(0, rawText.lastIndexOf('.'));
    }

    // Query overrides
    if (req.query.format) {
      const qFormat = req.query.format.toString().toLowerCase();
      const normFormat = qFormat === 'jpg' ? 'jpeg' : qFormat;
      if (!SUPPORTED_FORMATS.includes(normFormat as SupportedFormat)) {
        return res.status(400).json({
          success: false,
          message: `Invalid format '${qFormat}'. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`
        });
      }
      format = normFormat as SupportedFormat;
    }

    const theme = req.query.theme?.toString();
    if (theme) {
      const cleanTheme = theme.toLowerCase().trim();
      const isPreset = BADGE_THEME_NAMES.includes(cleanTheme);
      const hex = cleanTheme.startsWith('#') ? cleanTheme : `#${cleanTheme}`;
      const isValidHex = /^#[0-9A-F]{6}$/i.test(hex);
      if (!isPreset && !isValidHex) {
        return res.status(400).json({
          success: false,
          message: `Invalid theme '${theme}'. Must be a hex color or one of the supported themes: ${BADGE_THEME_NAMES.join(', ')}`
        });
      }
    }

    let type: SupportedBadgeType = 'standard';
    if (req.query.type) {
      const qType = req.query.type.toString().toLowerCase();
      if (!SUPPORTED_BADGE_TYPES.includes(qType as SupportedBadgeType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid type '${qType}'. Supported types: ${SUPPORTED_BADGE_TYPES.join(', ')}`
        });
      }
      type = qType as SupportedBadgeType;
    }

    const icon = req.query.icon ? req.query.icon.toString().toLowerCase() : undefined;
    if (icon && !ICON_NAMES.includes(icon)) {
      return res.status(400).json({
        success: false,
        message: `Invalid icon '${icon}'. Must be one of the supported whitelisted icons.`
      });
    }

    let width: number | undefined = undefined;
    if (req.query.width) {
      const qWidth = parseInt(req.query.width.toString(), 10);
      if (isNaN(qWidth) || qWidth < BADGE_MIN_WIDTH || qWidth > BADGE_MAX_WIDTH) {
        return res.status(400).json({
          success: false,
          message: `Invalid width '${req.query.width}'. Width must be an integer between ${BADGE_MIN_WIDTH} and ${BADGE_MAX_WIDTH}.`
        });
      }
      width = qWidth;
    }

    let height: number | undefined = undefined;
    if (req.query.height) {
      const qHeight = parseInt(req.query.height.toString(), 10);
      if (isNaN(qHeight) || qHeight < BADGE_MIN_HEIGHT || qHeight > BADGE_MAX_HEIGHT) {
        return res.status(400).json({
          success: false,
          message: `Invalid height '${req.query.height}'. Height must be an integer between ${BADGE_MIN_HEIGHT} and ${BADGE_MAX_HEIGHT}.`
        });
      }
      height = qHeight;
    }

    const buffer = await imageGeneratorService.generateBadge({
      text: cleanText,
      theme,
      type,
      format,
      icon,
      width,
      height,
    });

    res.set('Content-Type', `image/${format}`);
    res.set('Cache-Control', 'public, max-age=604800'); // Cache for 7 days
    res.status(200).send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};

/**
 * Returns JSON containing all available options (themes, icons, formats, etc.) for avatars and badges.
 */
export const getImageOptions = async (_req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        formats: SUPPORTED_FORMATS,
        avatar: {
          defaultSize: AVATAR_DEFAULT_SIZE,
          parameters: {
            identifier: { description: 'The text/name to render, passed in path segment (optional if query name or seed is provided)', type: 'string', required: false },
            name: { description: 'The initials/name to render (optional if path identifier or seed is provided)', type: 'string', required: false },
            seed: { description: 'A seed to generate a deterministic abstract geometric pattern (optional)', type: 'string', required: false },
            theme: { description: 'Background gradient preset or custom hex color', type: 'string', options: AVATAR_THEME_NAMES, required: false },
            shape: { description: 'The shape boundary of the avatar', type: 'string', options: SUPPORTED_SHAPES, required: false },
            size: { description: `Image width/height in pixels (min: ${AVATAR_MIN_SIZE}, max: ${AVATAR_MAX_SIZE})`, type: 'integer', default: AVATAR_DEFAULT_SIZE, required: false },
            len: { description: 'Max length of initials to render (options: 1, 2)', type: 'integer', default: 2, required: false },
            format: { description: 'Output image file format', type: 'string', options: SUPPORTED_FORMATS, required: false }
          }
        },
        badge: {
          defaultSize: {
            width: null,
            height: BADGE_DEFAULT_HEIGHT,
          },
          parameters: {
            identifier: { description: 'The badge label text, passed in path segment', type: 'string', required: true },
            text: { description: 'The badge label text, passed in query string (optional if path identifier is provided)', type: 'string', required: false },
            theme: { description: 'Color preset theme name or custom hex color', type: 'string', options: BADGE_THEME_NAMES, required: false },
            type: { description: 'Visual style template of the badge container', type: 'string', options: SUPPORTED_BADGE_TYPES, required: false },
            icon: { description: 'Whitelisted vector icon name to render next to text', type: 'string', options: ICON_NAMES, required: false },
            width: { description: `Custom pill container width in pixels (min: ${BADGE_MIN_WIDTH}, max: ${BADGE_MAX_WIDTH})`, type: 'integer', required: false },
            height: { description: `Custom pill container height in pixels (min: ${BADGE_MIN_HEIGHT}, max: ${BADGE_MAX_HEIGHT})`, type: 'integer', default: BADGE_DEFAULT_HEIGHT, required: false },
            format: { description: 'Output image file format', type: 'string', options: SUPPORTED_FORMATS, required: false }
          }
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: getErrorMessage(error) });
  }
};
