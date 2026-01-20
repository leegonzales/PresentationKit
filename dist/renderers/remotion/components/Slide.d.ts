/**
 * Slide Component
 *
 * Renders a single slide with full-screen image display,
 * section color indicator bar, and fade-in transition.
 */
import { type FC } from 'react';
import type { SlideProps } from '../types.js';
/**
 * Slide Component
 *
 * Displays a single presentation slide with:
 * - Full-screen image (object-fit: cover for landscape, contain for portrait)
 * - Fade-in animation on entry
 * - Section color indicator bar at the bottom
 */
export declare const Slide: FC<SlideProps>;
/**
 * SlideWithTitle Component
 *
 * Extended slide component that also displays the slide title.
 * Useful for title slides or when title overlay is desired.
 */
export declare const SlideWithTitle: FC<SlideProps & {
    showTitle?: boolean;
}>;
export default Slide;
//# sourceMappingURL=Slide.d.ts.map