/**
 * Kokoro TTS Audio Generator
 *
 * Local high-quality TTS synthesis using Kokoro on Apple Silicon via MLX-Audio.
 * Generates audio files for each slide with support for [PAUSE] markers.
 *
 * Note: Kokoro does NOT provide word-level timestamps.
 * Use ElevenLabs generator if captions/subtitles are required.
 */
import type { SlideContent } from '../../parsers/types.js';
import type { AudioGeneratorOptions, AudioManifest, TextSegment, KokoroVoice } from './types.js';
/**
 * Kokoro-specific options.
 */
export interface KokoroOptions extends AudioGeneratorOptions {
    /** Kokoro voice preset (default: af_heart) */
    voice?: KokoroVoice | string;
    /** Speech speed multiplier (default: 1.0) */
    speed?: number;
    /** Progress callback for UI feedback */
    onProgress?: (slideSlug: string, progress: number) => void;
}
/**
 * Parse text and split at [PAUSE] markers.
 *
 * Supported formats:
 *   [PAUSE]              - Insert 750ms of silence (default)
 *   [PAUSE:500]          - Insert 500ms of silence
 *   [PAUSE - comment]    - Pause with comment (comment ignored)
 *   [PAUSE:1000 - note]  - Duration with comment
 *
 * @param text - Input text with optional PAUSE markers
 * @returns Array of text segments with pause durations
 */
export declare function parsePauseMarkers(text: string): TextSegment[];
/**
 * Generate audio for all slides using Kokoro TTS.
 *
 * This is a local TTS solution running on Apple Silicon via MLX-Audio.
 * It does NOT provide word-level timestamps - use ElevenLabs for caption sync.
 *
 * @param slides - Array of slide content to synthesize
 * @param options - Kokoro configuration options
 * @returns Audio manifest with paths and durations (no word timings)
 */
export declare function generateKokoroAudio(slides: SlideContent[], options: KokoroOptions): Promise<AudioManifest>;
/**
 * List available Kokoro voices.
 *
 * @returns Array of voice information
 */
export declare function getKokoroVoices(): Promise<Array<{
    id: string;
    name: string;
    category: string;
}>>;
//# sourceMappingURL=kokoro.d.ts.map