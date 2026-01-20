/**
 * Talk Track v5 Type Definitions
 *
 * Core types for the Talk Track v5 format - the intermediate representation
 * for presentation content between authoring and generation.
 */

/**
 * Semantic tag types that provide structure and emphasis within audio blocks.
 */
export type SemanticTagType =
  | 'HOOK'
  | 'KEY_POINT'
  | 'EVIDENCE'
  | 'STORY'
  | 'TRANSITION'
  | 'CALLBACK'
  | 'LANDING'
  | 'CTA'
  | 'PAUSE';

/**
 * Semantic tag extracted from audio content.
 * Tags like [HOOK], [KEY_POINT], [PAUSE:500] provide emphasis and timing.
 */
export interface SemanticTag {
  /** Type of semantic tag */
  type: SemanticTagType;
  /** Associated content (for content tags like HOOK, KEY_POINT) */
  content?: string;
  /** Duration in milliseconds (for PAUSE tags) */
  duration?: number;
}

/**
 * Brand configuration for visual theming.
 */
export interface BrandConfig {
  /** Primary brand color (hex) */
  primary?: string;
  /** Background color (hex) */
  background?: string;
  /** Text color (hex) */
  text?: string;
}

/**
 * Section definition for logical slide groupings.
 */
export interface Section {
  /** Unique identifier in lowercase-kebab-case */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Hex color code for visual theming */
  color: string;
}

/**
 * Slide definition from the slides table.
 * Provides routing and metadata for each slide.
 */
export interface SlideDefinition {
  /** Slide position: "1", "2", "A1", "A2" (integers for main, A-prefix for appendix) */
  position: string;
  /** Unique identifier in lowercase-kebab-case */
  slug: string;
  /** Human-readable slide title */
  title: string;
  /** Filename of slide image in images/ folder */
  image: string;
  /** Section ID (must match a defined section id) */
  section: string;
}

/**
 * Complete content for a single slide.
 * Parsed from individual slide sections in the markdown.
 */
export interface SlideContent {
  /** Unique identifier matching the slide definition */
  slug: string;
  /** Slide title from the section header */
  title: string;
  /** Path to the slide image */
  imagePath: string;
  /** Spoken narration content from <!-- AUDIO --> blocks */
  audioText: string;
  /** Additional presenter context (not spoken) */
  speakerNotes?: string;
  /** Parsed semantic tags from the audio content */
  semanticTags: SemanticTag[];
}

/**
 * Complete Talk Track v5 document.
 * The authoritative source for presentation content.
 */
export interface TalkTrackV5 {
  /** Format version, must be 5 */
  version: 5;
  /** Presentation title */
  title: string;
  /** Presentation subtitle */
  subtitle?: string;
  /** Presenter name */
  author: string;
  /** Event or venue name */
  event?: string;
  /** Presentation date (YYYY-MM-DD) */
  date?: string;
  /** Target presentation duration in minutes */
  targetMinutes: number;
  /** Kokoro TTS voice ID */
  audioVoice: string;
  /** Visual branding configuration */
  branding?: BrandConfig;
  /** Section definitions */
  sections: Section[];
  /** Slide definitions from the slides table */
  slides: SlideDefinition[];
  /** Slide content indexed by slug */
  slideContent: Map<string, SlideContent>;
}

/**
 * Raw frontmatter as parsed from YAML (snake_case).
 * Converted to TalkTrackV5 format (camelCase) during parsing.
 */
export interface RawFrontmatter {
  version: number;
  title: string;
  subtitle?: string;
  author: string;
  event?: string;
  date?: string;
  target_minutes: number;
  audio_voice?: string;
  branding?: string | BrandConfig;
  sections: Section[];
}

/**
 * Result of parsing a Talk Track v5 document.
 */
export interface ParseResult {
  /** Whether parsing succeeded */
  success: boolean;
  /** Parsed document (present if success is true) */
  data?: TalkTrackV5;
  /** Error messages (present if success is false) */
  errors?: string[];
}
