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
import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { DEFAULT_NOTES_OPTIONS } from './types.js';
import { generateSpeakerNotesHtml } from './template.js';
export { DEFAULT_NOTES_OPTIONS } from './types.js';
/**
 * Strips semantic tags from audio text for clean display.
 * Removes tags like [HOOK], [KEY_POINT], [PAUSE:500], etc.
 */
function stripSemanticTags(audioText) {
    return audioText
        .replace(/\[(HOOK|KEY_POINT|EVIDENCE|STORY|TRANSITION|CALLBACK|LANDING|CTA|PAUSE)(?::\d+)?\]/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Calculates word count from text.
 */
function countWords(text) {
    if (!text || text.trim().length === 0) {
        return 0;
    }
    return text.trim().split(/\s+/).length;
}
/**
 * Estimates speaking duration in seconds based on word count.
 *
 * @param wordCount - Number of words
 * @param wordsPerMinute - Speaking rate (default: 150)
 * @returns Duration in seconds
 */
function estimateDuration(wordCount, wordsPerMinute) {
    return Math.round((wordCount / wordsPerMinute) * 60);
}
/**
 * Formats a date string or Date object for display.
 *
 * @param date - ISO date string (YYYY-MM-DD) or undefined
 * @returns Formatted date string (e.g., "January 19, 2026")
 */
function formatDate(date) {
    if (!date) {
        return new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }
    try {
        const parsed = new Date(date + 'T00:00:00');
        return parsed.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }
    catch {
        return date;
    }
}
/**
 * Prepares slide data for rendering.
 *
 * @param talkTrack - Parsed Talk Track v5 document
 * @param options - Rendering options
 * @returns Array of prepared slide data
 */
function prepareSlides(talkTrack, options) {
    const slides = [];
    for (const slideDef of talkTrack.slides) {
        const content = talkTrack.slideContent.get(slideDef.slug);
        if (!content) {
            continue;
        }
        // Clean audio text
        const cleanedAudioText = stripSemanticTags(content.audioText);
        if (!cleanedAudioText) {
            continue;
        }
        const wordCount = countWords(cleanedAudioText);
        const isAppendix = slideDef.section.toLowerCase() === 'appendix' ||
            slideDef.position.toUpperCase().startsWith('A');
        slides.push({
            position: slideDef.position,
            slug: slideDef.slug,
            title: slideDef.title,
            imagePath: slideDef.image,
            section: slideDef.section,
            audioText: cleanedAudioText,
            speakerNotes: content.speakerNotes,
            wordCount,
            estimatedDuration: estimateDuration(wordCount, options.wordsPerMinute),
            isAppendix,
        });
    }
    return slides;
}
/**
 * Prepares presentation metadata for rendering.
 *
 * @param talkTrack - Parsed Talk Track v5 document
 * @param slides - Prepared slide data
 * @returns Prepared metadata object
 */
function prepareMetadata(talkTrack, slides) {
    const totalWords = slides.reduce((sum, slide) => sum + slide.wordCount, 0);
    const totalDurationSeconds = slides.reduce((sum, slide) => sum + slide.estimatedDuration, 0);
    return {
        title: talkTrack.title,
        subtitle: talkTrack.subtitle,
        author: talkTrack.author,
        event: talkTrack.event,
        dateFormatted: formatDate(talkTrack.date),
        totalSlides: slides.length,
        totalWords,
        totalDurationMinutes: Math.round(totalDurationSeconds / 60),
        generatedAt: new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }),
    };
}
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
export async function renderSpeakerNotes(talkTrack, outputPath, options) {
    const opts = { ...DEFAULT_NOTES_OPTIONS, ...options };
    // Prepare data
    const slides = prepareSlides(talkTrack, opts);
    const metadata = prepareMetadata(talkTrack, slides);
    // Generate HTML
    const html = generateSpeakerNotesHtml(metadata, slides, opts);
    // Ensure output directory exists
    const outputDir = dirname(outputPath);
    await mkdir(outputDir, { recursive: true });
    // Write file
    await writeFile(outputPath, html, 'utf-8');
}
/**
 * Generates speaker notes HTML as a string without writing to disk.
 * Useful for preview or streaming scenarios.
 *
 * @param talkTrack - Parsed Talk Track v5 document
 * @param options - Optional rendering configuration
 * @returns HTML string
 */
export function renderSpeakerNotesToString(talkTrack, options) {
    const opts = { ...DEFAULT_NOTES_OPTIONS, ...options };
    const slides = prepareSlides(talkTrack, opts);
    const metadata = prepareMetadata(talkTrack, slides);
    return generateSpeakerNotesHtml(metadata, slides, opts);
}
/**
 * Gets summary statistics for speaker notes.
 * Useful for CLI output or validation.
 *
 * @param talkTrack - Parsed Talk Track v5 document
 * @param options - Optional rendering configuration
 * @returns Summary statistics
 */
export function getSpeakerNotesSummary(talkTrack, options) {
    const opts = { ...DEFAULT_NOTES_OPTIONS, ...options };
    const slides = prepareSlides(talkTrack, opts);
    const mainSlides = slides.filter((s) => !s.isAppendix);
    const appendixSlides = slides.filter((s) => s.isAppendix);
    const slidesWithNotes = slides.filter((s) => s.speakerNotes).length;
    const totalWords = slides.reduce((sum, s) => sum + s.wordCount, 0);
    const totalSeconds = slides.reduce((sum, s) => sum + s.estimatedDuration, 0);
    return {
        title: talkTrack.title,
        slideCount: slides.length,
        mainSlideCount: mainSlides.length,
        appendixSlideCount: appendixSlides.length,
        totalWords,
        estimatedMinutes: Math.round(totalSeconds / 60),
        slidesWithNotes,
    };
}
//# sourceMappingURL=index.js.map