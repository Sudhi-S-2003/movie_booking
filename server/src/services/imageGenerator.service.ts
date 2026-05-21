import sharp from 'sharp';
import {
  AVATAR_THEMES,
  AVATAR_THEME_NAMES,
  AVATAR_MIN_SIZE,
  AVATAR_MAX_SIZE,
  AVATAR_DEFAULT_SIZE,
  BADGE_THEMES,
  BADGE_ICONS,
  BADGE_MIN_WIDTH,
  BADGE_MAX_WIDTH,
  BADGE_DEFAULT_WIDTH,
  BADGE_MIN_HEIGHT,
  BADGE_MAX_HEIGHT,
  BADGE_DEFAULT_HEIGHT,
} from '../constants/image/index.js';
import type { SupportedFormat, SupportedShape, SupportedBadgeType } from '../constants/image/index.js';

export interface AvatarOptions {
  name?: string | undefined;
  seed?: string | undefined;
  size?: number | undefined;
  format?: SupportedFormat | undefined;
  shape?: SupportedShape | undefined;
  theme?: string | undefined;
  len?: number | undefined; // initials length: 1 or 2
}

export interface BadgeOptions {
  text: string;
  theme?: string | undefined;
  type?: SupportedBadgeType | undefined;
  format?: SupportedFormat | undefined;
  icon?: string | undefined; // named icon from the server-side whitelist
  width?: number | undefined;
  height?: number | undefined;
}

// Simple deterministic hash generator
const getHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

// Extract initials from a name (e.g. "Sudhi S" -> "SS" or "S")
const getInitials = (name: string, len: number = 2): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  
  if (len === 1 || parts.length === 1) {
    const firstPart = parts[0] || '';
    return firstPart.substring(0, 1).toUpperCase();
  }
  
  const firstPart = parts[0] || '';
  const lastPart = parts[parts.length - 1] || '';
  const fChar = firstPart[0] || '';
  const lChar = lastPart[0] || '';
  return (fChar + lChar).toUpperCase();
};

/**
 * Service generating dynamic avatars and badges as buffers using Sharp.
 */
export const imageGeneratorService = {
  /**
   * Generates a dynamic initials or geometric avatar image.
   */
  generateAvatar: async (options: AvatarOptions): Promise<Buffer> => {
    const size = Math.max(AVATAR_MIN_SIZE, Math.min(AVATAR_MAX_SIZE, options.size || AVATAR_DEFAULT_SIZE));
    const format = options.format || 'png';
    const shape = options.shape || 'circle';
    const name = options.name?.trim();
    const seed = options.seed?.trim() || name || 'default_avatar';
    const len = options.len || 2;

    const hash = getHash(seed);
    const themeName = AVATAR_THEME_NAMES[hash % AVATAR_THEME_NAMES.length] || 'rose';
    const fallbackTheme = AVATAR_THEMES[themeName] || AVATAR_THEMES.rose!;

    let bgStart = fallbackTheme.bgStart;
    let bgEnd = fallbackTheme.bgEnd;
    let textColor = fallbackTheme.text;

    if (options.theme) {
      const cleanTheme = options.theme.toLowerCase().trim();
      const themePreset = AVATAR_THEMES[cleanTheme];
      if (themePreset) {
        bgStart = themePreset.bgStart;
        bgEnd = themePreset.bgEnd;
        textColor = themePreset.text;
      } else {
        const hex = cleanTheme.startsWith('#') ? cleanTheme : `#${cleanTheme}`;
        const isValidHex = /^#[0-9A-F]{6}$/i.test(hex);
        if (isValidHex) {
          bgStart = hex;
          bgEnd = adjustColorBrightness(hex, -30);
          textColor = getContrastColor(hex);
        }
      }
    }

    let svg = '';

    if (name) {
      // Initials Avatar
      const initials = getInitials(name, len);
      const fontSize = Math.floor(size * (initials.length === 1 ? 0.45 : initials.length === 2 ? 0.38 : 0.3));

      svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <defs>
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${bgStart}" />
              <stop offset="100%" stop-color="${bgEnd}" />
            </linearGradient>
          </defs>
          ${
            shape === 'circle'
              ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#bgGrad)" />`
              : `<rect width="${size}" height="${size}" rx="${Math.floor(size * 0.1)}" fill="url(#bgGrad)" />`
          }
          <text 
            x="50%" 
            y="54%" 
            font-family="system-ui, -apple-system, sans-serif" 
            font-weight="700" 
            font-size="${fontSize}px" 
            fill="${textColor}" 
            text-anchor="middle" 
            dominant-baseline="middle"
          >${initials}</text>
        </svg>
      `.trim();
    } else {
      // Abstract Geometric Avatar
      const shapeCount = 3 + (hash % 3);
      let shapesSvg = '';

      for (let i = 0; i < shapeCount; i++) {
        const shapeHash = getHash(seed + i);
        const r = Math.floor(size * (0.2 + (shapeHash % 30) / 100));
        const cx = Math.floor(size * ((shapeHash % 60) + 20) / 100);
        const cy = Math.floor(size * (((shapeHash >> 2) % 60) + 20) / 100);
        const fillThemeName = AVATAR_THEME_NAMES[(shapeHash >> 4) % AVATAR_THEME_NAMES.length] || 'rose';
        const fillTheme = AVATAR_THEMES[fillThemeName] || AVATAR_THEMES.rose!;
        const shapeOpacity = 0.4 + (shapeHash % 4) / 10;
        
        shapesSvg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fillTheme.bgStart}" opacity="${shapeOpacity}" />`;
      }

      svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <defs>
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${bgStart}" />
              <stop offset="100%" stop-color="${bgEnd}" />
            </linearGradient>
            <clipPath id="shapeClip">
              ${
                shape === 'circle'
                  ? `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" />`
                  : `<rect width="${size}" height="${size}" rx="${Math.floor(size * 0.1)}" />`
              }
            </clipPath>
          </defs>
          <g clip-path="url(#shapeClip)">
            <rect width="${size}" height="${size}" fill="url(#bgGrad)" />
            ${shapesSvg}
          </g>
        </svg>
      `.trim();
    }

    return renderSharp(svg, format);
  },

  /**
   * Generates a customizable pill-shaped badge image.
   */
  generateBadge: async (options: BadgeOptions): Promise<Buffer> => {
    const text = options.text.trim();
    const width = Math.max(BADGE_MIN_WIDTH, Math.min(BADGE_MAX_WIDTH, options.width || BADGE_DEFAULT_WIDTH));
    const height = Math.max(BADGE_MIN_HEIGHT, Math.min(BADGE_MAX_HEIGHT, options.height || BADGE_DEFAULT_HEIGHT));
    const format = options.format || 'png';
    const type = options.type || 'standard';
    const hasIcon = !!options.icon && !!BADGE_ICONS[options.icon];

    // Determine color theme
    const themeName = options.theme?.toLowerCase() || 'slate';
    let theme = BADGE_THEMES[themeName];
    if (!theme) {
      const baseHex = options.theme?.startsWith('#') ? options.theme : `#${options.theme}`;
      const isValidHex = /^#[0-9A-F]{6}$/i.test(baseHex);
      if (isValidHex) {
        theme = {
          bgStart: adjustColorBrightness(baseHex, 40),
          bgEnd: baseHex,
          border: adjustColorBrightness(baseHex, -15),
          text: getContrastColor(baseHex),
        };
      } else {
        theme = BADGE_THEMES.slate!;
      }
    }
    
    // In case theme lookup fails
    if (!theme) {
      theme = BADGE_THEMES.slate!;
    }

    const rx = Math.floor(height / 2);
    const iconColor = theme.text;
    const textColor = theme.text;

    let filterDefs = '';
    let glowEffect = '';

    if (type === 'glowing') {
      filterDefs = `
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      `;
      glowEffect = 'filter="url(#glow)"';
    } else if (type === 'metallic') {
      filterDefs = `
        <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3"/>
          <stop offset="50%" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.2"/>
        </linearGradient>
      `;
    }

    let iconSvg = '';
    const resolvedIconPath = options.icon ? BADGE_ICONS[options.icon] : undefined;
    if (hasIcon && resolvedIconPath) {
      const iconSize = Math.floor(height * 0.45);
      const iconY = Math.floor((height - iconSize) / 2);
      const iconX = Math.floor(rx * 0.7);

      iconSvg = `
        <svg x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="${resolvedIconPath}" />
        </svg>
      `;
    }

    const textX = hasIcon ? '58%' : '50%';
    const fontSize = Math.max(9, Math.min(16, Math.floor(height * 0.35)));

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${theme.bgStart}" />
            <stop offset="100%" stop-color="${theme.bgEnd}" />
          </linearGradient>
          <linearGradient id="borderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0.2"/>
          </linearGradient>
          ${filterDefs}
        </defs>
        <g ${glowEffect}>
          <!-- Badge Body -->
          <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${rx}" fill="url(#badgeGrad)" stroke="${theme.border}" stroke-width="1.2" />
          
          ${type === 'metallic' ? `<rect x="1.5" y="1.5" width="${width - 3}" height="${height - 3}" rx="${rx - 0.5}" fill="url(#metal)" />` : ''}
          
          <!-- Optional Icon -->
          ${iconSvg}
          
          <!-- Badge Text -->
          <text 
            x="${textX}" 
            y="54%" 
            font-family="system-ui, -apple-system, sans-serif" 
            font-weight="800" 
            font-size="${fontSize}px" 
            fill="${textColor}" 
            text-anchor="middle" 
            dominant-baseline="middle"
            letter-spacing="0.05em"
          >${text.toUpperCase()}</text>
        </g>
      </svg>
    `.trim();

    return renderSharp(svg, format);
  },
};

// Helper: Run Sharp on SVG string
const renderSharp = async (svg: string, format: SupportedFormat): Promise<Buffer> => {
  const sharpInstance = sharp(Buffer.from(svg));
  if (format === 'jpeg') {
    return sharpInstance.jpeg({ quality: 90 }).toBuffer();
  } else if (format === 'webp') {
    return sharpInstance.webp({ quality: 90 }).toBuffer();
  } else {
    return sharpInstance.png().toBuffer();
  }
};

// Helper: Adjust color brightness (for darker gradients)
const adjustColorBrightness = (hex: string, percent: number): string => {
  let R = parseInt(hex.substring(1, 3), 16);
  let G = parseInt(hex.substring(3, 5), 16);
  let B = parseInt(hex.substring(5, 7), 16);

  R = Math.max(0, Math.min(255, R + (R * percent) / 100));
  G = Math.max(0, Math.min(255, G + (G * percent) / 100));
  B = Math.max(0, Math.min(255, B + (B * percent) / 100));

  const rHex = Math.floor(R).toString(16).padStart(2, '0');
  const gHex = Math.floor(G).toString(16).padStart(2, '0');
  const bHex = Math.floor(B).toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
};

// Helper: Find contrast text color for arbitrary hex background
const getContrastColor = (hex: string): string => {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  // YIQ formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#111827' : '#ffffff';
};
