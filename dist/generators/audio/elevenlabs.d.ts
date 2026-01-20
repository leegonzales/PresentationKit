/**
 * ElevenLabs Audio Generator
 *
 * High-quality TTS synthesis with word-level timestamps for caption synchronization.
 * Uses the ElevenLabs API with eleven_multilingual_v2 model for precise alignment data.
 */
import type { SlideContent } from '../../parsers/types.js';
import type { AudioGeneratorOptions, AudioManifestWithTimings } from './types.js';
/**
 * ElevenLabs-specific options.
 */
export interface ElevenLabsOptions extends AudioGeneratorOptions {
    /** ElevenLabs API key */
    apiKey: string;
    /** Voice ID to use for synthesis */
    voiceId: string;
    /** Model ID (default: eleven_multilingual_v2) */
    model?: string;
    /** Voice stability (0.0-1.0, default: 0.5) */
    stability?: number;
    /** Voice similarity boost (0.0-1.0, default: 0.75) */
    similarityBoost?: number;
    /** Voice style (0.0-1.0, default: 0.0) */
    style?: number;
    /** Enable speaker boost (default: true) */
    useSpeakerBoost?: boolean;
    /** Maximum characters per API call (default: 900) */
    maxChunkSize?: number;
    /** Maximum retry attempts (default: 3) */
    maxRetries?: number;
    /** Base delay for exponential backoff in ms (default: 1000) */
    retryDelay?: number;
}
/**
 * Generate audio for all slides using ElevenLabs TTS.
 *
 * @param slides - Array of slide content to synthesize
 * @param options - ElevenLabs configuration options
 * @returns Audio manifest with paths, durations, and word timings
 */
export declare function generateElevenLabsAudio(slides: SlideContent[], options: ElevenLabsOptions): Promise<AudioManifestWithTimings>;
/**
 * Get available voices from ElevenLabs.
 *
 * @param apiKey - ElevenLabs API key
 * @returns Array of available voices
 */
export declare function getElevenLabsVoices(apiKey: string): Promise<Array<{
    id: string;
    name: string;
    category?: string;
}>>;
//# sourceMappingURL=elevenlabs.d.ts.map