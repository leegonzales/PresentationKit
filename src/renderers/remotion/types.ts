/**
 * Remotion Video Renderer Types
 *
 * Type definitions for video rendering configuration and output.
 */

/**
 * Video quality presets with resolution mapping.
 */
export type VideoQuality = '720p' | '1080p' | '4k';

/**
 * Supported video codecs.
 */
export type VideoCodec = 'h264' | 'h265' | 'vp8' | 'vp9';

/**
 * Resolution configuration for each quality preset.
 */
export interface Resolution {
  width: number;
  height: number;
}

/**
 * Quality preset definitions.
 */
export const QUALITY_PRESETS: Record<VideoQuality, Resolution> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
};

/**
 * Codec to Remotion codec mapping.
 */
export const CODEC_MAP: Record<VideoCodec, string> = {
  h264: 'h264',
  h265: 'h265',
  vp8: 'vp8',
  vp9: 'vp9',
};

/**
 * Options for video rendering.
 */
export interface VideoRenderOptions {
  /** Video quality preset (720p, 1080p, 4k) */
  quality: VideoQuality;
  /** Video codec (h264, h265, vp8, vp9) */
  codec: VideoCodec;
  /** Constant Rate Factor - quality setting (18-28, lower = better quality) */
  crf: number;
  /** Output file path */
  outputPath: string;
  /** Progress callback (0-1) */
  onProgress?: (progress: number) => void;
}

/**
 * Result of a successful video render.
 */
export interface VideoRenderResult {
  /** Path to the rendered video file */
  outputPath: string;
  /** Video duration in seconds */
  durationSecs: number;
}

/**
 * Internal props passed to Remotion composition.
 */
export interface CompositionProps {
  /** Path to the timeline JSON file */
  timelinePath: string;
  /** Base path for resolving asset paths */
  assetsPath: string;
}

/**
 * Bundle options for Remotion.
 */
export interface BundleOptions {
  /** Entry point for the Remotion bundle */
  entryPoint: string;
  /** Output directory for the bundle */
  outputDir: string;
  /** Enable Webpack caching */
  enableCaching?: boolean;
}

// =============================================================================
// Composition Component Types
// =============================================================================

import type { Timeline, TimelineSlide, Caption, WordTiming } from '../../generators/timeline/types.js';

/**
 * Props for the main Presentation composition.
 */
export interface PresentationProps {
  /** Complete timeline data for the presentation */
  timeline: Timeline;
  /** Base path to assets (images, audio) */
  assetsPath: string;
}

/**
 * Props for individual slide components.
 */
export interface SlideProps {
  /** Timeline data for this specific slide */
  slide: TimelineSlide;
  /** Base path to assets */
  assetsPath: string;
  /** Whether this slide is currently active */
  isActive?: boolean;
}

/**
 * Props for caption overlay component.
 */
export interface CaptionOverlayProps {
  /** Caption segments to display */
  captions: Caption[];
  /** Current playback time in seconds (relative to slide start) */
  currentTime: number;
  /** Whether to show word-level highlighting */
  showWordHighlight?: boolean;
}

/**
 * Props for transition effects between slides.
 */
export interface TransitionProps {
  /** Transition type */
  type: 'fade' | 'crossfade' | 'none';
  /** Transition duration in seconds */
  duration: number;
  /** Progress through the transition (0-1) */
  progress: number;
}

/**
 * Video configuration for Remotion compositions.
 */
export interface VideoConfig {
  /** Video width in pixels */
  width: number;
  /** Video height in pixels */
  height: number;
  /** Frames per second */
  fps: number;
  /** Total duration in frames */
  durationInFrames: number;
}

/**
 * Section color mapping for visual theming.
 */
export interface SectionColors {
  [sectionId: string]: string;
}

/**
 * Props for the section indicator bar.
 */
export interface SectionIndicatorProps {
  /** Section color (hex) */
  color: string;
  /** Section name for accessibility */
  sectionName?: string;
  /** Indicator height in pixels */
  height?: number;
}

/**
 * Word highlight state for karaoke-style captions.
 */
export interface WordHighlightState {
  /** Index of the currently highlighted word */
  currentWordIndex: number;
  /** Words with their highlight status */
  words: Array<{
    text: string;
    isSpoken: boolean;
    isCurrent: boolean;
  }>;
}

/**
 * Caption display configuration.
 */
export interface CaptionConfig {
  /** Font size in pixels */
  fontSize: number;
  /** Font family */
  fontFamily: string;
  /** Text color */
  color: string;
  /** Background color with opacity */
  backgroundColor: string;
  /** Padding around text in pixels */
  padding: number;
  /** Border radius in pixels */
  borderRadius: number;
  /** Position from bottom of screen in pixels */
  bottomOffset: number;
}

/**
 * Default caption configuration.
 */
export const DEFAULT_CAPTION_CONFIG: CaptionConfig = {
  fontSize: 42,
  fontFamily: 'Inter, system-ui, sans-serif',
  color: '#ffffff',
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  padding: 16,
  borderRadius: 8,
  bottomOffset: 80,
};

/**
 * Default transition configuration.
 */
export const DEFAULT_TRANSITION_DURATION = 0.3; // seconds

/**
 * Default video configuration.
 */
export const DEFAULT_VIDEO_CONFIG: Omit<VideoConfig, 'durationInFrames'> = {
  width: 1920,
  height: 1080,
  fps: 30,
};

// Re-export timeline types for convenience
export type { Timeline, TimelineSlide, Caption, WordTiming };
