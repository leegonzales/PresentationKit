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

import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import type { TalkTrackV5, Section } from '../../parsers/types.js';
import type { Timeline } from '../../generators/timeline/types.js';
import type {
  HtmlOptions,
  PreparedHtmlSlide,
  PreparedHtmlMetadata,
  SectionInfo,
} from './types.js';
import { DEFAULT_HTML_OPTIONS } from './types.js';
import { generateHtmlPresentation } from './template.js';

// Re-export types for convenience
export type {
  HtmlOptions,
  PreparedHtmlSlide,
  PreparedHtmlMetadata,
  SectionInfo,
} from './types.js';
export { DEFAULT_HTML_OPTIONS } from './types.js';

// Re-export standalone renderer
export {
  renderStandaloneHtml,
  type StandaloneHtmlOptions,
} from './standalone.js';

/**
 * Strips semantic tags from audio text for clean display.
 * Removes tags like [HOOK], [KEY_POINT], [PAUSE:500], etc.
 */
function stripSemanticTags(audioText: string): string {
  return audioText
    .replace(
      /\[(HOOK|KEY_POINT|EVIDENCE|STORY|TRANSITION|CALLBACK|LANDING|CTA|PAUSE)(?::\d+)?\]/gi,
      '',
    )
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formats a date string or Date object for display.
 *
 * @param date - ISO date string (YYYY-MM-DD) or undefined
 * @returns Formatted date string (e.g., "January 19, 2026")
 */
function formatDate(date?: string): string {
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
  } catch {
    return date;
  }
}

/**
 * Gets section color from the TalkTrack sections array.
 *
 * @param sectionId - The section ID to look up
 * @param sections - Array of Section definitions
 * @param defaultColor - Fallback color if section not found
 * @returns Hex color string
 */
function getSectionColor(
  sectionId: string,
  sections: Section[],
  defaultColor: string,
): string {
  const section = sections.find(
    (s) => s.id.toLowerCase() === sectionId.toLowerCase(),
  );
  return section?.color ?? defaultColor;
}

/**
 * Gets section name from the TalkTrack sections array.
 *
 * @param sectionId - The section ID to look up
 * @param sections - Array of Section definitions
 * @returns Section name or ID as fallback
 */
function getSectionName(sectionId: string, sections: Section[]): string {
  const section = sections.find(
    (s) => s.id.toLowerCase() === sectionId.toLowerCase(),
  );
  return section?.name ?? sectionId;
}

/**
 * Prepares slide data for rendering.
 *
 * @param talkTrack - Parsed Talk Track v5 document
 * @param timeline - Timeline with audio data (null if no audio)
 * @param options - Rendering options
 * @returns Array of prepared slide data
 */
function prepareSlides(
  talkTrack: TalkTrackV5,
  timeline: Timeline | null,
  options: Required<HtmlOptions>,
): PreparedHtmlSlide[] {
  const slides: PreparedHtmlSlide[] = [];

  for (const slideDef of talkTrack.slides) {
    const content = talkTrack.slideContent.get(slideDef.slug);

    // Get timeline data if available
    const timelineSlide = timeline?.slides.find((s) => s.slug === slideDef.slug);

    // Determine audio path and duration
    let audioPath: string | null = null;
    let audioDuration = 0;

    if (timelineSlide?.audioPath) {
      audioPath = timelineSlide.audioPath;
      audioDuration = timelineSlide.audioDuration;
    }

    // Get section info
    const sectionColor = getSectionColor(
      slideDef.section,
      talkTrack.sections,
      options.primaryColor,
    );

    // Prepare speaker notes
    let speakerNotes: string | undefined;
    if (content?.audioText) {
      speakerNotes = stripSemanticTags(content.audioText);
    }
    // Append additional speaker notes if present
    if (content?.speakerNotes) {
      speakerNotes = speakerNotes
        ? `${speakerNotes}\n\n${content.speakerNotes}`
        : content.speakerNotes;
    }

    const isAppendix =
      slideDef.section.toLowerCase() === 'appendix' ||
      slideDef.position.toUpperCase().startsWith('A');

    slides.push({
      position: slideDef.position,
      slug: slideDef.slug,
      title: slideDef.title,
      imagePath: options.imageBasePath + slideDef.image,
      section: getSectionName(slideDef.section, talkTrack.sections),
      sectionColor,
      audioPath: audioPath ? options.audioBasePath + audioPath.split('/').pop() : null,
      audioDuration,
      speakerNotes,
      isAppendix,
    });
  }

  return slides;
}

/**
 * Extracts section information from prepared slides.
 *
 * @param slides - Prepared slide data
 * @param talkTrackSections - Section definitions from TalkTrack
 * @returns Array of section info with slide indices
 */
function extractSections(
  slides: PreparedHtmlSlide[],
  talkTrackSections: Section[],
): SectionInfo[] {
  const sections: SectionInfo[] = [];
  let currentSection = '';
  let currentStartIndex = 0;
  let currentCount = 0;

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];

    if (slide.section !== currentSection) {
      // Save previous section if exists
      if (currentSection && currentCount > 0) {
        const sectionDef = talkTrackSections.find(
          (s) => s.name === currentSection || s.id === currentSection,
        );
        sections.push({
          id: sectionDef?.id ?? currentSection.toLowerCase().replace(/\s+/g, '-'),
          name: currentSection,
          color: slides[currentStartIndex].sectionColor,
          startIndex: currentStartIndex,
          slideCount: currentCount,
        });
      }

      // Start new section
      currentSection = slide.section;
      currentStartIndex = i;
      currentCount = 1;
    } else {
      currentCount++;
    }
  }

  // Save last section
  if (currentSection && currentCount > 0) {
    const sectionDef = talkTrackSections.find(
      (s) => s.name === currentSection || s.id === currentSection,
    );
    sections.push({
      id: sectionDef?.id ?? currentSection.toLowerCase().replace(/\s+/g, '-'),
      name: currentSection,
      color: slides[currentStartIndex].sectionColor,
      startIndex: currentStartIndex,
      slideCount: currentCount,
    });
  }

  return sections;
}

/**
 * Prepares presentation metadata for rendering.
 *
 * @param talkTrack - Parsed Talk Track v5 document
 * @param slides - Prepared slide data
 * @param timeline - Timeline data (null if no audio)
 * @returns Prepared metadata object
 */
function prepareMetadata(
  talkTrack: TalkTrackV5,
  slides: PreparedHtmlSlide[],
  timeline: Timeline | null,
): PreparedHtmlMetadata {
  const totalAudioDuration = timeline?.totalDuration ?? 0;

  return {
    title: talkTrack.title,
    subtitle: talkTrack.subtitle,
    author: talkTrack.author,
    event: talkTrack.event,
    dateFormatted: formatDate(talkTrack.date),
    totalSlides: slides.length,
    targetMinutes: talkTrack.targetMinutes,
    totalAudioDuration,
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
 * Merges user options with defaults and branding from TalkTrack.
 *
 * @param talkTrack - Parsed Talk Track v5 document
 * @param options - User-provided options
 * @returns Merged options with all fields populated
 */
function mergeOptions(
  talkTrack: TalkTrackV5,
  options?: HtmlOptions,
): Required<HtmlOptions> {
  const branding = talkTrack.branding ?? {};

  return {
    ...DEFAULT_HTML_OPTIONS,
    // Apply branding defaults from TalkTrack
    primaryColor: branding.primary ?? DEFAULT_HTML_OPTIONS.primaryColor,
    backgroundColor: branding.background ?? DEFAULT_HTML_OPTIONS.backgroundColor,
    textColor: branding.text ?? DEFAULT_HTML_OPTIONS.textColor,
    targetMinutes: talkTrack.targetMinutes,
    // Override with user options
    ...options,
  };
}

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
export async function renderHtmlPresentation(
  talkTrack: TalkTrackV5,
  timeline: Timeline | null,
  outputPath: string,
  options?: HtmlOptions,
): Promise<void> {
  const opts = mergeOptions(talkTrack, options);

  // Prepare data
  const slides = prepareSlides(talkTrack, timeline, opts);
  const sections = extractSections(slides, talkTrack.sections);
  const metadata = prepareMetadata(talkTrack, slides, timeline);

  // Generate HTML
  const html = generateHtmlPresentation(metadata, slides, sections, opts);

  // Ensure output directory exists
  const outputDir = dirname(outputPath);
  await mkdir(outputDir, { recursive: true });

  // Write file
  await writeFile(outputPath, html, 'utf-8');
}

/**
 * Generates HTML presentation as a string without writing to disk.
 * Useful for preview or streaming scenarios.
 *
 * @param talkTrack - Parsed Talk Track v5 document
 * @param timeline - Timeline with audio data (null if no audio)
 * @param options - Optional rendering configuration
 * @returns HTML string
 */
export function renderHtmlPresentationToString(
  talkTrack: TalkTrackV5,
  timeline: Timeline | null,
  options?: HtmlOptions,
): string {
  const opts = mergeOptions(talkTrack, options);

  const slides = prepareSlides(talkTrack, timeline, opts);
  const sections = extractSections(slides, talkTrack.sections);
  const metadata = prepareMetadata(talkTrack, slides, timeline);

  return generateHtmlPresentation(metadata, slides, sections, opts);
}

/**
 * Gets summary statistics for the HTML presentation.
 * Useful for CLI output or validation.
 *
 * @param talkTrack - Parsed Talk Track v5 document
 * @param timeline - Timeline with audio data (null if no audio)
 * @returns Summary statistics
 */
export function getHtmlPresentationSummary(
  talkTrack: TalkTrackV5,
  timeline: Timeline | null,
): {
  title: string;
  slideCount: number;
  mainSlideCount: number;
  appendixSlideCount: number;
  sectionCount: number;
  hasAudio: boolean;
  totalAudioDuration: number;
  targetMinutes: number;
} {
  const opts = mergeOptions(talkTrack, {});
  const slides = prepareSlides(talkTrack, timeline, opts);
  const sections = extractSections(slides, talkTrack.sections);

  const mainSlides = slides.filter((s) => !s.isAppendix);
  const appendixSlides = slides.filter((s) => s.isAppendix);
  const hasAudio = slides.some((s) => s.audioPath !== null);
  const totalAudioDuration = timeline?.totalDuration ?? 0;

  return {
    title: talkTrack.title,
    slideCount: slides.length,
    mainSlideCount: mainSlides.length,
    appendixSlideCount: appendixSlides.length,
    sectionCount: sections.length,
    hasAudio,
    totalAudioDuration,
    targetMinutes: talkTrack.targetMinutes,
  };
}
