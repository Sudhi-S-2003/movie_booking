/**
 * Supported avatar shapes (circle, square).
 */
export const SUPPORTED_SHAPES = ['circle', 'square'] as const;

export type SupportedShape = typeof SUPPORTED_SHAPES[number];
