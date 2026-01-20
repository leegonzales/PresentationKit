/**
 * Talk Track v5 Parser
 *
 * Parses Talk Track v5 markdown files into structured data for
 * presentation and audio generation.
 */
import type { TalkTrackV5, RawFrontmatter } from './types.js';
export declare class TalkTrackParseError extends Error {
    readonly errors: string[];
    constructor(message: string, errors?: string[]);
}
/**
 * Strips semantic tags from audio text for clean TTS input.
 */
export declare function stripSemanticTags(audioText: string): string;
/**
 * Parses a Talk Track v5 markdown document into structured data.
 *
 * @param content - The full markdown content of the talk track file
 * @returns Parsed TalkTrackV5 object
 * @throws TalkTrackParseError if parsing fails
 *
 * @example
 * ```typescript
 * import { parseTalkTrack } from './parsers/talk-track.js';
 * import { readFileSync } from 'fs';
 *
 * const content = readFileSync('talk-track.md', 'utf-8');
 * const talkTrack = parseTalkTrack(content);
 *
 * console.log(talkTrack.title);
 * console.log(talkTrack.slides.length);
 *
 * for (const [slug, slide] of talkTrack.slideContent) {
 *   console.log(`${slug}: ${slide.audioText.length} chars of audio`);
 * }
 * ```
 */
export declare function parseTalkTrack(content: string): TalkTrackV5;
/**
 * Safely parses a Talk Track v5 document, returning errors instead of throwing.
 *
 * @param content - The full markdown content
 * @returns Object with success flag, data, and errors
 */
export declare function safeParseTalkTrack(content: string): {
    success: boolean;
    data?: TalkTrackV5;
    errors?: string[];
};
/**
 * Extracts only the frontmatter from a Talk Track document.
 * Useful for quick metadata inspection without full parsing.
 */
export declare function extractFrontmatter(content: string): RawFrontmatter;
/**
 * Validates a Talk Track document without fully parsing it.
 * Returns a list of validation errors.
 */
export declare function validateTalkTrack(content: string): string[];
//# sourceMappingURL=talk-track.d.ts.map