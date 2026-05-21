import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import sharp from 'sharp';

export interface CaptchaData {
  text: string;
  captchaImage: string;
}

export interface CaptchaOptions {
  width?: number;
  height?: number;
  length?: number;
  style?: 'straight' | 'rotated';
  imageType?: 'png' | 'jpeg' | 'webp';
}

const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; // Excluded confusing characters (O, 0, I, 1, l, o)
const CAPTCHA_COLORS = ['#34d399', '#a78bfa', '#818cf8', '#fb7185', '#38bdf8']; // Modern glowing brand colors

// Helpers for cleaner random number generation
const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Generates a clean, modern, and readable captcha with character rotation
 * and noise lines designed to disrupt basic optical OCR programs.
 */
export const generateCaptcha = async ({
  width = 150,
  height = 50,
  length = randomInt(4, 5),
  style = 'rotated',
  imageType = 'png'
}: CaptchaOptions = {}): Promise<CaptchaData> => {
  let text = '';
  for (let i = 0; i < length; i++) {
    text += CAPTCHA_CHARS.charAt(randomInt(0, CAPTCHA_CHARS.length - 1));
  }

  const isStraight = style === 'straight';
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  
  // Slate background matching CinemaConnect dark-mode aesthetics
  svg += `<rect width="100%" height="100%" fill="#0f172a" rx="6" stroke="#1e293b" stroke-width="1.5"/>`;

  // Draw background noise lines
  for (let i = 0; i < 5; i++) {
    const x1 = randomFloat(0, width);
    const y1 = randomFloat(0, height);
    const x2 = randomFloat(0, width);
    const y2 = randomFloat(0, height);
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#334155" stroke-width="1.5"/>`;
  }

  // Draw background noise dots
  for (let i = 0; i < 12; i++) {
    const cx = randomFloat(0, width);
    const cy = randomFloat(0, height);
    const r = randomFloat(1, 2.5);
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#475569" opacity="0.7"/>`;
  }

  // Draw characters with distinct rotations, offsets, and vibrant slate colors
  const sectionWidth = width / text.length;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    // Calculate positioning
    const baseX = i * sectionWidth + (sectionWidth / 2) - 8;
    const x = baseX + (isStraight ? 0 : randomFloat(-2, 2));
    const y = 35 + (isStraight ? 0 : randomFloat(-3, 3));
    
    // Calculate styling
    const rotate = isStraight ? 0 : randomFloat(-12, 12);
    const fontSize = isStraight ? 30 : randomInt(28, 31);
    const color = CAPTCHA_COLORS[randomInt(0, CAPTCHA_COLORS.length - 1)];

    svg += `<text x="${x}" y="${y}" font-family="monospace" font-weight="900" font-size="${fontSize}" fill="${color}" transform="rotate(${rotate} ${x} ${y})">${char}</text>`;
  }

  svg += `</svg>`;

  let base64Image = '';
  if (imageType === 'jpeg') {
    const jpegBuffer = await sharp(Buffer.from(svg)).jpeg().toBuffer();
    base64Image = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;
  } else if (imageType === 'webp') {
    const webpBuffer = await sharp(Buffer.from(svg)).webp().toBuffer();
    base64Image = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
  } else {
    // Default to png
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    base64Image = `data:image/png;base64,${pngBuffer.toString('base64')}`;
  }

  return { text, captchaImage: base64Image };
};

/**
 * Signs a short-lived token (expires in 3 minutes) containing the captcha text.
 * Prevents reuse and keeps verification completely stateless.
 */
export const createCaptchaToken = (text: string): string => {
  return jwt.sign(
    { captchaText: text.toUpperCase() },
    env.JWT_SECRET,
    { expiresIn: '3m' }
  );
};

/**
 * Validates the user's captcha answer against the cryptographically signed token.
 */
export const verifyCaptcha = (userAnswer: string | undefined, token: string | undefined): boolean => {
  if (!userAnswer || !token) return false;
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { captchaText: string };
    return decoded.captchaText === userAnswer.trim().toUpperCase();
  } catch (error) {
    // Fails validation if token has expired or is tampered with
    return false;
  }
};
