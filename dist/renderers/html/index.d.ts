/**
 * HTML Presentation Renderer
 *
 * Generates interactive HTML presentations from Talk Track v5 documents.
 * Output is a self-contained HTML file with embedded CSS and JavaScript.
 *
 * Features:
 * - Full-screen slide display with keyboard navigation
 * - Speaker notes toggle (N key)
 * - Timer display with warnings (T key to toggle)
 * - Progress bar and slide counter
 * - Audio playback per slide (if audio exists)
 * - Section indicator with color theming
 * - Touch/swipe support for mobile
 * - Print to PDF support (P key)
 * - Help overlay (H or ? key)
 *
 * @example
 * ```typescript
 * import { renderHtmlPresentation } from './renderers/html/index.js';
 * import { parseTalkTrack } from './parsers/talk-track.js';
 * import { readFileSync } from 'fs';
 *
 * const content = readFileSync('talk-track.md', 'utf-8');
 * const talkTrack = parseTalkTrack(content);
 *
 * // Without audio (timeline is null)
 * await renderHtmlPresentation(talkTrack, null, './output/presentation.html');
 *
 * // With audio timeline
 * await renderHtmlPresentation(talkTrack, timeline, './output/presentation.html', {
 *   primaryColor: '#2563eb',
 * });
 * ```
 */
import type { TalkTrackV5 } from '../../parsers/types.js';
import type { Timeline } from '../../generators/timeline/types.js';
import type { HtmlOptions } from './types.js';
export type { HtmlOptions, PreparedHtmlSlide, PreparedHtmlMetadata, SectionInfo, } from './types.js';
export { DEFAULT_HTML_OPTIONS } from './types.js';
/**
 * Renders an interactive HTML presentation from a Talk Track v5 document.
 *
 * @param talkTrack - Parsed Talk Track v5 document
 * @param timeline - Timeline with audio data (null if no audio generated)
 * @param outputPath - Path to write the HTML file
 * @param options - Optional rendering configuration
 * @throws Error if writing fails
 *
 * @example
 * ```typescript
 * import { renderHtmlPresentation } from './renderers/html/index.js';
 *
 * // Without audio
 * await renderHtmlPresentation(talkTrack, null, './output/presentation.html');
 *
 * // With audio timeline
 * await renderHtmlPresentation(talkTrack, timeline, './output/presentation.html', {
 *   primaryColor: '#2563eb',
 *   showProgressBar: true,
 * });
 * ```
 */
export declare function renderHtmlPresentation(talkTrack: TalkTrackV5, timeline: Timeline | null, outputPath: string, options?: HtmlOptions): Promise<void>;
/**
 * Generates HTML presentation as a string without writing to disk.
 * Useful for preview or streaming scenarios.
 *
 * @param talkTrack - Parsed Talk Track v5 document
 * @param timeline - Timeline with audio data (null if no audio)
 * @param options - Optional rendering configuration
 * @returns HTML string
 */
export declare function renderHtmlPresentationToString(talkTrack: TalkTrackV5, timeline: Timeline | null, options?: HtmlOptions): string;
/**
 * Gets summary statistics for the HTML presentation.
 * Useful for CLI output or validation.
 *
 * @param talkTrack - Parsed Talk Track v5 document
 * @param timeline - Timeline with audio data (null if no audio)
 * @returns Summary statistics
 */
export declare function getHtmlPresentationSummary(talkTrack: TalkTrackV5, timeline: Timeline | null): {
    title: string;
    slideCount: number;
    mainSlideCount: number;
    appendixSlideCount: number;
    sectionCount: number;
    hasAudio: boolean;
    totalAudioDuration: number;
    targetMinutes: number;
};
//# sourceMappingURL=index.d.ts.map