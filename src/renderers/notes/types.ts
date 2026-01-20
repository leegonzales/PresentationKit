/**
 * Speaker Notes Renderer Types
 *
 * Configuration and options for the speaker notes HTML generator.
 */

/**
 * Options for speaker notes rendering.
 */
export interface NotesOptions {
  /** Include slide thumbnails in output (default: true) */
  includeThumbnails?: boolean;
  /** Base path for slide images (default: "images/") */
  imageBasePath?: string;
  /** Include table of contents (default: true) */
  includeToc?: boolean;
  /** Include timing estimates (default: true) */
  includeTimingEstimates?: boolean;
  /** Words per minute for timing calculation (default: 150) */
  wordsPerMinute?: number;
  /** Primary brand color (hex, default: #557373) */
  primaryColor?: string;
  /** Appendix section marker color (hex, default: #888888) */
  appendixColor?: string;
}

/**
 * Default options for speaker notes rendering.
 */
export const DEFAULT_NOTES_OPTIONS: Required<NotesOptions> = {
  includeThumbnails: true,
  imageBasePath: 'images/',
  includeToc: true,
  includeTimingEstimates: true,
  wordsPerMinute: 150,
  primaryColor: '#557373',
  appendixColor: '#888888',
};

/**
 * Prepared slide data for rendering.
 */
export interface PreparedSlide {
  /** Slide position (e.g., "1", "2", "A1") */
  position: string;
  /** Unique slug identifier */
  slug: string;
  /** Slide title */
  title: string;
  /** Path to slide image */
  imagePath: string;
  /** Section identifier */
  section: string;
  /** Cleaned audio text for display */
  audioText: string;
  /** Optional speaker notes */
  speakerNotes?: string;
  /** Word count of audio text */
  wordCount: number;
  /** Estimated duration in seconds */
  estimatedDuration: number;
  /** Whether this is an appendix slide */
  isAppendix: boolean;
}

/**
 * Prepared presentation metadata for rendering.
 */
export interface PreparedMetadata {
  /** Presentation title */
  title: string;
  /** Presentation subtitle */
  subtitle?: string;
  /** Presenter name */
  author: string;
  /** Event or venue name */
  event?: string;
  /** Formatted date string */
  dateFormatted: string;
  /** Total slide count */
  totalSlides: number;
  /** Total word count */
  totalWords: number;
  /** Total estimated duration in minutes */
  totalDurationMinutes: number;
  /** Generation timestamp */
  generatedAt: string;
}
