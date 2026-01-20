/**
 * Speaker Notes Renderer
 *
 * Generates printable speaker notes HTML from Talk Track v5 documents.
 * Output is a single HTML file optimized for printing to PDF or paper.
 *
 * Features:
 * - Cover page with presentation metadata
 * - Table of contents with section links
 * - One slide per page with thumbnail and talk track
 * - Timing estimates based on word count
 * - Print-friendly CSS with proper page breaks
 *
 * @example
 * ```typescript
 * import { renderSpeakerNotes } from './renderers/notes/index.js';
 * import { parseTalkTrack } from './parsers/talk-track.js';
 * import { readFileSync } from 'fs';
 *
 * const content = readFileSync('talk-track.md', 'utf-8');
 * const talkTrack = parseTalkTrack(content);
 *
 * await renderSpeakerNotes(talkTrack, './output/speaker-notes.html', {
 *   includeThumbnails: true,
 *   wordsPerMinute: 150,
 * });
 * ```
 */
import type { TalkTrackV5 } from '../../parsers/types.js';
import type { NotesOptions } from './types.js';
export type { NotesOptions, PreparedSlide, PreparedMetadata } from './types.js';
export { DEFAULT_NOTES_OPTIONS } from './types.js';
/**
 * Renders speaker notes HTML from a Talk Track v5 document.
 *
 * @param talkTrack - Parsed Talk Track v5 document
 * @param outputPath - Path to write the HTML file
 * @param options - Optional rendering configuration
 * @throws Error if writing fails
 *
 * @example
 * ```typescript
 * import { renderSpeakerNotes } from './renderers/notes/index.js';
 *
 * await renderSpeakerNotes(talkTrack, './output/speaker-notes.html');
 *
 * // With options
 * await renderSpeakerNotes(talkTrack, './output/notes.html', {
 *   includeThumbnails: false,
 *   wordsPerMinute: 140,
 *   primaryColor: '#2563eb',
 * });
 * ```
 */
export declare function renderSpeakerNotes(talkTrack: TalkTrackV5, outputPath: string, options?: NotesOptions): Promise<void>;
/**
 * Generates speaker notes HTML as a string without writing to disk.
 * Useful for preview or streaming scenarios.
 *
 * @param talkTrack - Parsed Talk Track v5 document
 * @param options - Optional rendering configuration
 * @returns HTML string
 */
export declare function renderSpeakerNotesToString(talkTrack: TalkTrackV5, options?: NotesOptions): string;
/**
 * Gets summary statistics for speaker notes.
 * Useful for CLI output or validation.
 *
 * @param talkTrack - Parsed Talk Track v5 document
 * @param options - Optional rendering configuration
 * @returns Summary statistics
 */
export declare function getSpeakerNotesSummary(talkTrack: TalkTrackV5, options?: NotesOptions): {
    title: string;
    slideCount: number;
    mainSlideCount: number;
    appendixSlideCount: number;
    totalWords: number;
    estimatedMinutes: number;
    slidesWithNotes: number;
};
//# sourceMappingURL=index.d.ts.map