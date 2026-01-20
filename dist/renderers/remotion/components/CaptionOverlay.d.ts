/**
 * CaptionOverlay Component
 *
 * Displays captions/subtitles for the presentation with support for:
 * - Current caption highlighting
 * - Word-level highlighting (karaoke style) when wordTimings available
 * - Semi-transparent background for readability
 */
import { type FC } from 'react';
import type { CaptionOverlayProps } from '../types.js';
/**
 * CaptionOverlay Component
 *
 * Displays captions at the bottom center of the screen with:
 * - Semi-transparent background
 * - Fade in/out transitions
 * - Optional word-level highlighting
 */
export declare const CaptionOverlay: FC<CaptionOverlayProps>;
/**
 * CompactCaptionOverlay Component
 *
 * A more compact version of the caption overlay suitable for
 * dense content or when more screen real estate is needed.
 */
export declare const CompactCaptionOverlay: FC<CaptionOverlayProps>;
export default CaptionOverlay;
//# sourceMappingURL=CaptionOverlay.d.ts.map