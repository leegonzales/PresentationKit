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
import { DEFAULT_NOTES_OPTIONS } from './types.js';

/**
 * Formats seconds into "M:SS" display format.
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Breaks text into paragraphs of 2-3 sentences for readability.
 */
function breakIntoParagraphs(text: string): string[] {
  // Split on sentence boundaries (period, exclamation, question followed by space and capital)
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
  const paragraphs: string[] = [];
  let current: string[] = [];

  for (const sentence of sentences) {
    current.push(sentence);
    if (current.length >= 3) {
      paragraphs.push(current.join(' '));
      current = [];
    }
  }

  if (current.length > 0) {
    paragraphs.push(current.join(' '));
  }

  return paragraphs;
}

/**
 * Generates CSS styles for the speaker notes document.
 */
function generateStyles(options: Required<NotesOptions>): string {
  return `
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        @page {
            size: letter;
            margin: 0.5in;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #1a1a1a;
        }

        /* Screen-only scroll snap for presentation view */
        @media screen {
            html {
                scroll-snap-type: y mandatory;
                overflow-y: scroll;
            }
        }

        /* Cover Page */
        .cover {
            page-break-after: always;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            text-align: center;
            scroll-snap-align: start;
        }

        .cover h1 {
            font-size: 28pt;
            margin-bottom: 0.5em;
            color: ${options.primaryColor};
        }

        .cover .subtitle {
            font-size: 14pt;
            color: #666;
            margin-bottom: 2em;
        }

        .cover .meta {
            font-size: 11pt;
            color: #888;
        }

        .cover .duration-summary {
            margin-top: 2em;
            padding: 1em 2em;
            background: #f5f5f5;
            border-radius: 8px;
            font-size: 12pt;
        }

        .cover .duration-summary strong {
            color: ${options.primaryColor};
        }

        /* Table of Contents */
        .toc {
            page-break-after: always;
            padding: 40px;
            scroll-snap-align: start;
            min-height: 100vh;
        }

        .toc h2 {
            font-size: 18pt;
            color: ${options.primaryColor};
            margin-bottom: 1em;
            border-bottom: 2px solid ${options.primaryColor};
            padding-bottom: 0.5em;
        }

        .toc-list {
            list-style: none;
            padding: 0;
        }

        .toc-list li {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: baseline;
        }

        .toc-list li:last-child {
            border-bottom: none;
        }

        .toc-list a {
            color: #333;
            text-decoration: none;
        }

        .toc-list a:hover {
            color: ${options.primaryColor};
        }

        .toc-list .slide-num {
            font-weight: bold;
            color: ${options.primaryColor};
            min-width: 50px;
        }

        .toc-list .slide-timing {
            color: #888;
            font-size: 10pt;
            margin-left: 1em;
        }

        .toc-section {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: bold;
            color: #666;
            font-size: 10pt;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        /* Slide Page */
        .slide-page {
            page-break-after: always;
            height: 100vh;
            display: flex;
            flex-direction: column;
            scroll-snap-align: start;
        }

        .slide-page:last-child {
            page-break-after: avoid;
        }

        .slide-header {
            background: ${options.primaryColor};
            color: white;
            padding: 8px 12px;
            font-size: 10pt;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .slide-header.appendix-marker {
            background: ${options.appendixColor};
        }

        .slide-number {
            font-weight: bold;
        }

        .slide-title {
            font-weight: normal;
        }

        .slide-timing {
            font-size: 9pt;
            opacity: 0.9;
        }

        .slide-content {
            flex: 1;
            display: flex;
            gap: 20px;
            padding: 15px;
            overflow: hidden;
        }

        .slide-image-container {
            flex: 0 0 45%;
            display: flex;
            align-items: flex-start;
            justify-content: center;
        }

        .slide-image {
            max-width: 100%;
            max-height: 4.5in;
            border: 1px solid #ddd;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .no-thumbnail {
            flex: 0 0 45%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f0f0f0;
            border: 1px dashed #ccc;
            color: #999;
            font-size: 10pt;
            min-height: 200px;
        }

        .slide-notes {
            flex: 1;
            overflow: hidden;
            font-size: 10.5pt;
            line-height: 1.45;
        }

        .slide-notes p {
            margin-bottom: 0.8em;
            text-align: justify;
            hyphens: auto;
        }

        .slide-notes p:last-child {
            margin-bottom: 0;
        }

        .speaker-notes {
            margin-top: 1em;
            padding-top: 0.8em;
            border-top: 1px solid #ddd;
        }

        .speaker-notes-label {
            font-size: 9pt;
            color: #666;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5em;
        }

        .speaker-notes-content {
            font-style: italic;
            color: #555;
            font-size: 10pt;
        }

        .word-count {
            font-size: 9pt;
            color: #888;
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px solid #eee;
        }

        /* Print Styles */
        @media print {
            .slide-page {
                height: auto;
                min-height: 100vh;
            }

            .slide-content {
                flex: 1;
            }

            .toc a {
                color: #333;
            }
        }

        /* Screen Styles */
        @media screen {
            body {
                background: #f0f0f0;
                padding: 20px;
            }

            .cover, .toc, .slide-page {
                background: white;
                margin: 0 auto 20px;
                max-width: 8.5in;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                height: auto;
                min-height: 11in;
            }
        }
    `;
}

/**
 * Generates the cover page HTML.
 */
function generateCoverPage(metadata: PreparedMetadata): string {
  const subtitleHtml = metadata.subtitle
    ? `<div class="subtitle">${escapeHtml(metadata.subtitle)}</div>`
    : '';

  const eventHtml = metadata.event
    ? `${escapeHtml(metadata.event)}<br>`
    : '';

  return `
    <div class="cover">
        <h1>${escapeHtml(metadata.title)}</h1>
        ${subtitleHtml}
        <div class="meta">
            ${eventHtml}
            ${escapeHtml(metadata.dateFormatted)}<br><br>
            <em>By ${escapeHtml(metadata.author)}</em>
        </div>
        <div class="duration-summary">
            <strong>${metadata.totalSlides}</strong> slides |
            <strong>${metadata.totalWords.toLocaleString()}</strong> words |
            <strong>~${metadata.totalDurationMinutes}</strong> minutes
        </div>
        <div class="meta" style="margin-top: 2em;">
            <em>Generated ${escapeHtml(metadata.generatedAt)}</em>
        </div>
    </div>`;
}

/**
 * Generates the table of contents HTML.
 */
function generateToc(slides: PreparedSlide[], options: Required<NotesOptions>): string {
  let currentSection = '';
  const items: string[] = [];

  for (const slide of slides) {
    // Add section header when section changes
    if (slide.section !== currentSection) {
      currentSection = slide.section;
      items.push(`<div class="toc-section">${escapeHtml(currentSection)}</div>`);
    }

    const numDisplay = slide.isAppendix ? `Appendix ${slide.position}` : `Slide ${slide.position}`;
    const timingHtml = options.includeTimingEstimates
      ? `<span class="slide-timing">${formatDuration(slide.estimatedDuration)}</span>`
      : '';

    items.push(`
            <li>
                <a href="#slide-${slide.slug}">
                    <span class="slide-num">${numDisplay}</span>
                    ${escapeHtml(slide.title)}
                </a>
                ${timingHtml}
            </li>`);
  }

  return `
    <div class="toc">
        <h2>Table of Contents</h2>
        <ul class="toc-list">
            ${items.join('\n')}
        </ul>
    </div>`;
}

/**
 * Generates a single slide page HTML.
 */
function generateSlidePage(slide: PreparedSlide, options: Required<NotesOptions>): string {
  const headerClass = slide.isAppendix ? 'slide-header appendix-marker' : 'slide-header';
  const numDisplay = slide.isAppendix ? `Appendix ${slide.position}` : `Slide ${slide.position}`;

  const timingHtml = options.includeTimingEstimates
    ? `<span class="slide-timing">${formatDuration(slide.estimatedDuration)}</span>`
    : '';

  // Image or placeholder
  let imageHtml: string;
  if (options.includeThumbnails) {
    const imageSrc = options.imageBasePath + slide.imagePath;
    imageHtml = `
            <div class="slide-image-container">
                <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(slide.title)}" class="slide-image">
            </div>`;
  } else {
    imageHtml = `<div class="no-thumbnail">[Thumbnail disabled]</div>`;
  }

  // Break audio text into paragraphs
  const paragraphs = breakIntoParagraphs(slide.audioText);
  const notesHtml = paragraphs
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('\n                ');

  // Speaker notes if present
  let speakerNotesHtml = '';
  if (slide.speakerNotes) {
    speakerNotesHtml = `
                <div class="speaker-notes">
                    <div class="speaker-notes-label">Speaker Notes</div>
                    <div class="speaker-notes-content">${escapeHtml(slide.speakerNotes)}</div>
                </div>`;
  }

  return `
    <div class="slide-page" id="slide-${slide.slug}">
        <div class="${headerClass}">
            <span class="slide-number">${numDisplay}</span>
            <span class="slide-title">${escapeHtml(slide.title)}</span>
            ${timingHtml}
        </div>
        <div class="slide-content">
            ${imageHtml}
            <div class="slide-notes">
                ${notesHtml}
                ${speakerNotesHtml}
                <div class="word-count">${slide.wordCount} words</div>
            </div>
        </div>
    </div>`;
}

/**
 * Escapes HTML special characters for safe rendering.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates the complete speaker notes HTML document.
 *
 * @param metadata - Prepared presentation metadata
 * @param slides - Prepared slide data array
 * @param options - Rendering options
 * @returns Complete HTML document as string
 */
export function generateSpeakerNotesHtml(
  metadata: PreparedMetadata,
  slides: PreparedSlide[],
  options?: NotesOptions,
): string {
  const opts: Required<NotesOptions> = { ...DEFAULT_NOTES_OPTIONS, ...options };

  const tocHtml = opts.includeToc ? generateToc(slides, opts) : '';

  const slidePagesHtml = slides
    .map((slide) => generateSlidePage(slide, opts))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(metadata.title)} - Speaker Notes</title>
    <style>${generateStyles(opts)}
    </style>
</head>
<body>
    ${generateCoverPage(metadata)}
    ${tocHtml}
    ${slidePagesHtml}
</body>
</html>
`;
}
