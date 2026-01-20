/**
 * Caption Synchronization
 *
 * Utilities for aligning captions with audio timing.
 * Handles both word-level timing (ElevenLabs) and estimation (Kokoro).
 */
import type { Caption, WordTiming } from './types.js';
/**
 * Splits text into sentences for captioning.
 * Handles common sentence-ending punctuation and edge cases.
 *
 * @param text - Raw text to split into sentences
 * @returns Array of sentence strings
 *
 * @example
 * ```typescript
 * const sentences = splitIntoSentences("Hello world. How are you? I'm fine!");
 * // ["Hello world.", "How are you?", "I'm fine!"]
 * ```
 */
export declare function splitIntoSentences(text: string): string[];
/**
 * Aligns captions to audio using word-level timing from ElevenLabs.
 * Creates caption segments that match sentence boundaries.
 *
 * @param text - Original text that was spoken
 * @param wordTimings - Word-level timing data from TTS provider
 * @returns Array of aligned captions
 *
 * @example
 * ```typescript
 * const captions = alignCaptionsToAudio(
 *   "Hello world. How are you?",
 *   [
 *     { word: "Hello", start: 0.0, end: 0.3 },
 *     { word: "world.", start: 0.4, end: 0.7 },
 *     { word: "How", start: 0.9, end: 1.1 },
 *     { word: "are", start: 1.2, end: 1.3 },
 *     { word: "you?", start: 1.4, end: 1.7 },
 *   ]
 * );
 * ```
 */
export declare function alignCaptionsToAudio(text: string, wordTimings: WordTiming[]): Caption[];
/**
 * Estimates caption timings when word-level timing is unavailable.
 * Uses a fixed words-per-minute rate for estimation.
 *
 * @param text - Text to create captions for
 * @param startOffset - Starting time offset in seconds
 * @param wpm - Words per minute rate (default: 150)
 * @returns Array of estimated captions
 *
 * @example
 * ```typescript
 * // For Kokoro TTS which doesn't provide word timings
 * const captions = estimateCaptionTimings("Hello world. How are you?", 0);
 * ```
 */
export declare function estimateCaptionTimings(text: string, startOffset?: number, wpm?: number): Caption[];
/**
 * Adjusts caption timings to fit within a specified duration.
 * Scales all timings proportionally to match the actual audio duration.
 *
 * @param captions - Original captions with estimated or actual timings
 * @param targetDuration - Actual audio duration in seconds
 * @returns Captions with adjusted timings
 */
export declare function scaleCaptionsToAudioDuration(captions: Caption[], targetDuration: number): Caption[];
//# sourceMappingURL=caption-sync.d.ts.map