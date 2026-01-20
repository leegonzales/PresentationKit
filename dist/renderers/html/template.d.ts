/**
 * HTML Presentation Template
 *
 * Generates a self-contained, interactive HTML presentation with:
 * - Full-screen slide display
 * - Keyboard navigation (arrows, space, Page Up/Down)
 * - Speaker notes toggle (N key)
 * - Timer display (T key to toggle)
 * - Progress bar
 * - Audio playback per slide (if audio exists)
 * - Section indicator with color
 * - Slide counter
 * - Touch/swipe support for mobile
 * - Print to PDF support (P key)
 * - Help overlay (H or ? key)
 */
import type { HtmlOptions, PreparedHtmlSlide, PreparedHtmlMetadata, SectionInfo } from './types.js';
/**
 * Generates the complete HTML presentation document.
 *
 * @param metadata - Prepared presentation metadata
 * @param slides - Prepared slide data array
 * @param sections - Section information array
 * @param options - Rendering options
 * @returns Complete HTML document as string
 */
export declare function generateHtmlPresentation(metadata: PreparedHtmlMetadata, slides: PreparedHtmlSlide[], sections: SectionInfo[], options?: HtmlOptions): string;
//# sourceMappingURL=template.d.ts.map