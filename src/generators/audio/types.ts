/**
 * Audio Generator Types
 *
 * Common types and interfaces for audio generation in PresentationKit.
 * Supports multiple TTS providers: ElevenLabs (with timestamps) and Kokoro (local).
 */

import type { SlideContent } from '../../parsers/types.js';

/**
 * Supported TTS provider identifiers.
 */
export type AudioProvider = 'kokoro' | 'elevenlabs';

/**
 * Word-level timing information from TTS synthesis.
 * Used for caption synchronization and subtitle generation.
 * Note: Only available with ElevenLabs provider.
 */
export interface WordTiming {
  /** The word or punctuation */
  word: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
}

/**
 * Result of synthesizing audio for a single slide.
 */
export interface AudioResult {
  /** Unique identifier for the slide */
  slideSlug: string;
  /** Path to the generated audio file */
  audioPath: string;
  /** Audio duration in seconds */
  durationSecs: number;
  /** Character count for billing */
  characterCount: number;
}

/**
 * Extended audio result with word-level timing data.
 */
export interface AudioResultWithTimings extends AudioResult {
  /** Word-level timestamps for caption sync */
  wordTimings: WordTiming[];
}

/**
 * Audio manifest containing all generated audio for a presentation.
 */
export interface AudioManifest {
  /** Total duration of all audio in seconds */
  totalDurationSecs: number;
  /** Total characters processed (for billing) */
  totalCharacters: number;
  /** Individual audio results per slide */
  slides: AudioResult[];
}

/**
 * Extended audio manifest with word timing data.
 */
export interface AudioManifestWithTimings extends Omit<AudioManifest, 'slides'> {
  /** Individual audio results with word timings */
  slides: AudioResultWithTimings[];
}

/**
 * Base options for all audio generators.
 */
export interface AudioGeneratorOptions {
  /** Output directory for generated audio files */
  outputDir: string;
  /** Audio format: 'mp3' or 'wav' */
  format?: 'mp3' | 'wav';
  /** Sample rate in Hz (default: 44100) */
  sampleRate?: number;
  /** Whether to include word-level timestamps */
  includeTimestamps?: boolean;
}

/**
 * Audio generator function signature.
 */
export type AudioGenerator<TOptions extends AudioGeneratorOptions> = (
  slides: SlideContent[],
  options: TOptions
) => Promise<AudioManifest | AudioManifestWithTimings>;

/**
 * Segment of text with optional pause after.
 * Used for parsing [PAUSE] markers in Kokoro TTS.
 */
export interface TextSegment {
  /** Text content to speak */
  text: string;
  /** Pause duration in milliseconds after this segment (null = no pause) */
  pauseAfterMs: number | null;
}

/**
 * Available Kokoro TTS voices.
 */
export const KOKORO_VOICES = {
  // American English Female
  af_heart: 'Warm, friendly female voice',
  af_bella: 'Clear, professional female voice',
  af_nova: 'Energetic female voice',
  af_sky: 'Light, airy female voice',
  // American English Male
  am_adam: 'Deep, authoritative male voice',
  am_echo: 'Smooth male voice',
  // British English
  bf_alice: 'British female voice',
  bf_emma: 'British female voice',
  bm_daniel: 'British male voice',
  bm_george: 'British male voice',
} as const;

export type KokoroVoice = keyof typeof KOKORO_VOICES;

/**
 * Voice configuration for multi-voice audio generation.
 * Maps a display name to a Kokoro voice ID.
 */
export interface VoiceConfig {
  /** Display name for the voice (e.g., "George", "Emma") */
  name: string;
  /** Kokoro voice ID (e.g., "bm_george", "bf_emma") */
  voiceId: KokoroVoice | string;
}

/**
 * Multi-voice audio manifest.
 * Contains audio paths for each configured voice.
 */
export interface MultiVoiceAudioManifest {
  /** Array of voice configurations used */
  voices: VoiceConfig[];
  /** Per-voice audio manifests keyed by voice name (lowercase) */
  voiceManifests: Record<string, AudioManifest>;
  /** Total characters processed (same for all voices) */
  totalCharacters: number;
}

/**
 * Default multi-voice configuration: George and Emma.
 */
export const DEFAULT_MULTI_VOICES: VoiceConfig[] = [
  { name: 'George', voiceId: 'bm_george' },
  { name: 'Emma', voiceId: 'bf_emma' },
];
