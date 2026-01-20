/**
 * Remotion Root
 *
 * Composition registry for PresentationKit video rendering.
 * This file is the entry point for Remotion's bundler.
 */
import React from 'react';
import { Presentation, PresentationWithAudioTrack } from './Presentation.js';
import type { PresentationProps, Timeline } from './types.js';
/**
 * RemotionRoot Component
 *
 * Registers all available compositions for rendering:
 * - Presentation: Standard presentation with per-slide audio
 * - PresentationSingleTrack: Presentation with concatenated audio track
 */
export declare const RemotionRoot: React.FC;
export { Presentation, PresentationWithAudioTrack };
export type { PresentationProps, Timeline };
//# sourceMappingURL=Root.d.ts.map