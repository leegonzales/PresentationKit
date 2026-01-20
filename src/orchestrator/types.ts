/**
 * Orchestrator Types
 *
 * Core types for the presentation build orchestrator.
 * Manages state machine transitions, build manifests, and cost tracking.
 */

import type { AudioProvider } from '../generators/audio/types.js';

/**
 * Build states representing the pipeline stages.
 * Transitions flow from init -> complete (or failed at any point).
 */
export type BuildState =
  | 'init'
  | 'parsing'
  | 'generating_audio'
  | 'building_timeline'
  | 'rendering_html'
  | 'rendering_video'
  | 'rendering_notes'
  | 'complete'
  | 'failed';

/**
 * Output format types that can be generated.
 */
export type OutputFormat = 'html' | 'video' | 'notes';

/**
 * Video quality presets.
 */
export type VideoQuality = '720p' | '1080p' | '4k';

/**
 * Video quality resolution mappings.
 */
export const VIDEO_QUALITY_RESOLUTION: Record<VideoQuality, { width: number; height: number }> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
};

/**
 * Cost entry for tracking resource usage.
 */
export interface CostEntry {
  /** Type of cost */
  type: 'elevenlabs_characters' | 'remotion_render_seconds' | 'api_call';
  /** Description of what generated this cost */
  description: string;
  /** Quantity (characters, seconds, etc.) */
  quantity: number;
  /** Estimated cost in USD (null if free/local) */
  estimatedCostUsd: number | null;
  /** Timestamp when cost was incurred */
  timestamp: string;
}

/**
 * Source information for the build.
 */
export interface BuildSource {
  /** Path to the talk track file */
  talkTrack: string;
  /** Content hash for cache invalidation */
  hash: string;
}

/**
 * Generated output paths.
 */
export interface BuildOutputs {
  /** Path to HTML presentation (if generated) */
  html?: string;
  /** Path to video file (if generated) */
  video?: string;
  /** Path to speaker notes (if generated) */
  notes?: string;
  /** Path to timeline JSON (always generated) */
  timeline?: string;
}

/**
 * Asset manifest tracking generated files.
 */
export interface BuildAssets {
  /** Array of generated audio file paths */
  audio: string[];
  /** Array of slide image paths */
  images: string[];
}

/**
 * Complete build manifest persisted to disk.
 * Enables build resumption and provides audit trail.
 */
export interface BuildManifest {
  /** Unique build identifier (nanoid) */
  id: string;
  /** Build creation timestamp (ISO 8601) */
  createdAt: string;
  /** Build completion timestamp (ISO 8601) */
  completedAt?: string;
  /** Source file information */
  source: BuildSource;
  /** Generated output paths */
  outputs: BuildOutputs;
  /** Generated asset paths */
  assets: BuildAssets;
  /** Cost tracking entries */
  costs: CostEntry[];
  /** Current build state */
  state: BuildState;
  /** Error message if state is 'failed' */
  error?: string;
  /** Last successful state (for resume) */
  lastSuccessfulState?: BuildState;
  /** Audio provider used */
  audioProvider: AudioProvider;
  /** Voice ID used for audio generation */
  voice: string;
  /** Requested output formats */
  requestedOutputs: OutputFormat[];
  /** Video quality setting (if video requested) */
  videoQuality?: VideoQuality;
}

/**
 * Options for building a presentation.
 */
export interface BuildOptions {
  /** Output formats to generate */
  outputs: OutputFormat[];
  /** TTS provider to use */
  audioProvider: AudioProvider;
  /** Voice ID for TTS */
  voice: string;
  /** Video quality preset (default: 1080p) */
  videoQuality?: VideoQuality;
  /** Output directory for all generated files */
  outputDir: string;
  /** Progress callback */
  onProgress?: (state: BuildState, progress: number, message: string) => void;
}

/**
 * State transition definition.
 */
export interface StateTransition {
  /** State transitioning from */
  from: BuildState;
  /** State transitioning to */
  to: BuildState;
  /** Whether this state can be resumed from */
  canResume: boolean;
}

/**
 * Progress information for build status updates.
 */
export interface BuildProgress {
  /** Current state */
  state: BuildState;
  /** Progress percentage (0-100) */
  progress: number;
  /** Human-readable status message */
  message: string;
  /** Elapsed time in milliseconds */
  elapsedMs?: number;
  /** Estimated time remaining in milliseconds */
  estimatedRemainingMs?: number;
}
