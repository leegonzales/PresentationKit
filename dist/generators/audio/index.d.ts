/**
 * PresentationKit Audio Generators
 *
 * This module provides audio generation adapters for different TTS providers:
 * - ElevenLabs: Cloud-based with word-level timestamps for caption sync
 * - Kokoro: Local TTS on Apple Silicon, no timestamps (audio-only mode)
 */
export type { AudioProvider, WordTiming, AudioResult, AudioResultWithTimings, AudioManifest, AudioManifestWithTimings, AudioGeneratorOptions, AudioGenerator, TextSegment, KokoroVoice, } from './types.js';
export { KOKORO_VOICES } from './types.js';
export { generateElevenLabsAudio, getElevenLabsVoices, type ElevenLabsOptions, } from './elevenlabs.js';
export { generateKokoroAudio, getKokoroVoices, parsePauseMarkers, type KokoroOptions, } from './kokoro.js';
//# sourceMappingURL=index.d.ts.map