/**
 * Speaker Notes HTML Template
 *
 * Generates print-friendly HTML for speaker notes with:
 * - Cover page with metadata
 * - Table of contents with section links
 * - One slide per page with thumbnail and talk track
 * - Print-optimized CSS with proper page breaks
 */
import type { NotesOptions, PreparedSlide, PreparedMetadata } from './types.js';
/**
 * Generates the complete speaker notes HTML document.
 *
 * @param metadata - Prepared presentation metadata
 * @param slides - Prepared slide data array
 * @param options - Rendering options
 * @returns Complete HTML document as string
 */
export declare function generateSpeakerNotesHtml(metadata: PreparedMetadata, slides: PreparedSlide[], options?: NotesOptions): string;
//# sourceMappingURL=template.d.ts.map