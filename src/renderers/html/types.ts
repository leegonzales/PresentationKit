/**
 * HTML Presentation Renderer Types
 *
 * Configuration and options for the interactive HTML presentation generator.
 */

/**
 * Options for HTML presentation rendering.
 */
export interface HtmlOptions {
  /** Base path for slide images (default: "images/") */
  imageBasePath?: string;
  /** Base path for audio files (default: "audio/") */
  audioBasePath?: string;
  /** Primary brand color for UI elements (hex, default: from branding or #557373) */
  primaryColor?: string;
  /** Background color (hex, default: from branding or #0d0d0d) */
  backgroundColor?: string;
  /** Text color (hex, default: from branding or #ffffff) */
  textColor?: string;
  /** Show progress bar (default: true) */
  showProgressBar?: boolean;
  /** Show section indicator (default: true) */
  showSectionIndicator?: boolean;
  /** Show slide counter (default: true) */
  showSlideCounter?: boolean;
  /** Enable touch/swipe navigation (default: true) */
  enableTouchNavigation?: boolean;
  /** Enable print to PDF support (default: true) */
  enablePrintSupport?: boolean;
  /** Target presentation duration in minutes (for timer warnings) */
  targetMinutes?: number;
}

/**
 * Default options for HTML presentation rendering.
 */
export const DEFAULT_HTML_OPTIONS: Required<HtmlOptions> = {
  imageBasePath: 'images/',
  audioBasePath: 'audio/',
  primaryColor: '#557373',
  backgroundColor: '#0d0d0d',
  textColor: '#ffffff',
  showProgressBar: true,
  showSectionIndicator: true,
  showSlideCounter: true,
  enableTouchNavigation: true,
  enablePrintSupport: true,
  targetMinutes: 45,
};

/**
 * Voice audio configuration for a slide.
 */
export interface VoiceAudio {
  /** Voice display name */
  name: string;
  /** Path to audio file for this voice */
  audioPath: string;
  /** Audio duration in seconds */
  audioDuration: number;
}

/**
 * Prepared slide data for HTML presentation rendering.
 */
export interface PreparedHtmlSlide {
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
  /** Section color (hex) */
  sectionColor: string;
  /** Path to audio file (null if no audio) - for single voice */
  audioPath: string | null;
  /** Audio duration in seconds (0 if no audio) - for single voice */
  audioDuration: number;
  /** Multi-voice audio paths (null if single voice or no audio) */
  voiceAudio?: VoiceAudio[];
  /** Cleaned speaker notes for display */
  speakerNotes?: string;
  /** Whether this is an appendix slide */
  isAppendix: boolean;
}

/**
 * Prepared presentation metadata for HTML rendering.
 */
export interface PreparedHtmlMetadata {
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
  /** Target duration in minutes */
  targetMinutes: number;
  /** Total audio duration in seconds (0 if no audio) */
  totalAudioDuration: number;
  /** Generation timestamp */
  generatedAt: string;
}

/**
 * Section information for presentation navigation.
 */
export interface SectionInfo {
  /** Section ID */
  id: string;
  /** Section display name */
  name: string;
  /** Section color */
  color: string;
  /** First slide index in this section */
  startIndex: number;
  /** Number of slides in this section */
  slideCount: number;
}
