/**
 * PresentationKit Audio Generators
 *
 * This module provides audio generation adapters for different TTS providers:
 * - ElevenLabs: Cloud-based with word-level timestamps for caption sync
 * - Kokoro: Local TTS on Apple Silicon, no timestamps (audio-only mode)
 */
export { KOKORO_VOICES } from './types.js';
// ElevenLabs Generator
export { generateElevenLabsAudio, getElevenLabsVoices, } from './elevenlabs.js';
// Kokoro Generator (Local TTS)
export { generateKokoroAudio, getKokoroVoices, parsePauseMarkers, } from './kokoro.js';
//# sourceMappingURL=index.js.map