/**
 * ElevenLabs Audio Generator
 *
 * High-quality TTS synthesis with word-level timestamps for caption synchronization.
 * Uses the ElevenLabs API with eleven_multilingual_v2 model for precise alignment data.
 */
import got, { HTTPError } from 'got';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
/**
 * Rate limit error for retry logic.
 */
class RateLimitError extends Error {
    retryAfter;
    constructor(retryAfter) {
        super(`Rate limited. Retry after ${retryAfter}ms`);
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
    }
}
/**
 * Generate audio for all slides using ElevenLabs TTS.
 *
 * @param slides - Array of slide content to synthesize
 * @param options - ElevenLabs configuration options
 * @returns Audio manifest with paths, durations, and word timings
 */
export async function generateElevenLabsAudio(slides, options) {
    const { apiKey, voiceId, outputDir, model = 'eleven_multilingual_v2', format = 'mp3', stability = 0.5, similarityBoost = 0.75, style = 0.0, useSpeakerBoost = true, maxChunkSize = 900, maxRetries = 3, retryDelay = 1000, } = options;
    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });
    // Create HTTP client with base configuration
    const client = got.extend({
        prefixUrl: 'https://api.elevenlabs.io/v1',
        headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
        },
        responseType: 'json',
        timeout: {
            request: 120000, // 2 minute timeout for long audio
        },
    });
    const results = [];
    let totalCharacters = 0;
    let totalDurationSecs = 0;
    // Process each slide sequentially to respect rate limits
    for (const slide of slides) {
        if (!slide.audioText || slide.audioText.trim().length === 0) {
            // Skip slides with no audio content
            continue;
        }
        const cleanText = cleanTextForSynthesis(slide.audioText);
        const characterCount = cleanText.length;
        totalCharacters += characterCount;
        let audioBuffer;
        let wordTimings;
        let durationSecs;
        if (cleanText.length <= maxChunkSize) {
            // Single chunk synthesis
            const result = await synthesizeWithRetry(client, voiceId, cleanText, {
                model,
                stability,
                similarityBoost,
                style,
                useSpeakerBoost,
            }, maxRetries, retryDelay);
            audioBuffer = result.audioBuffer;
            wordTimings = result.wordTimings;
            durationSecs = result.durationSecs;
        }
        else {
            // Multi-chunk synthesis for long text
            const chunkedResult = await synthesizeChunkedText(client, voiceId, cleanText, {
                model,
                stability,
                similarityBoost,
                style,
                useSpeakerBoost,
                maxChunkSize,
                maxRetries,
                retryDelay,
            });
            audioBuffer = chunkedResult.audioBuffer;
            wordTimings = chunkedResult.wordTimings;
            durationSecs = chunkedResult.durationSecs;
        }
        // Write audio file
        const audioFilename = `${slide.slug}.${format}`;
        const audioPath = join(outputDir, audioFilename);
        await writeFile(audioPath, audioBuffer);
        totalDurationSecs += durationSecs;
        results.push({
            slideSlug: slide.slug,
            audioPath,
            durationSecs,
            characterCount,
            wordTimings,
        });
    }
    return {
        totalDurationSecs,
        totalCharacters,
        slides: results,
    };
}
/**
 * Synthesize text with automatic retry on rate limiting.
 */
async function synthesizeWithRetry(client, voiceId, text, settings, maxRetries, baseDelay) {
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await client.post(`text-to-speech/${voiceId}/with-timestamps`, {
                json: {
                    text,
                    model_id: settings.model,
                    voice_settings: {
                        stability: settings.stability,
                        similarity_boost: settings.similarityBoost,
                        style: settings.style,
                        use_speaker_boost: settings.useSpeakerBoost,
                    },
                },
            });
            const data = response.body;
            const audioBuffer = Buffer.from(data.audio_base64, 'base64');
            // Parse word timings from character-level alignment
            const wordTimings = parseWordTimestamps(data.alignment.characters, data.alignment.character_start_times_seconds, data.alignment.character_end_times_seconds);
            // Calculate duration from word timings or estimate from buffer
            const durationSecs = wordTimings.length > 0
                ? wordTimings[wordTimings.length - 1].end
                : estimateDurationFromBuffer(audioBuffer);
            return { audioBuffer, wordTimings, durationSecs };
        }
        catch (error) {
            lastError = error;
            if (error instanceof HTTPError) {
                const statusCode = error.response.statusCode;
                // Handle rate limiting (429)
                if (statusCode === 429) {
                    const retryAfter = parseRetryAfter(error.response.headers['retry-after']);
                    const delay = retryAfter || baseDelay * Math.pow(2, attempt);
                    if (attempt < maxRetries) {
                        console.warn(`ElevenLabs rate limited. Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
                        await sleep(delay);
                        continue;
                    }
                }
                // Handle server errors (5xx) with retry
                if (statusCode >= 500 && attempt < maxRetries) {
                    const delay = baseDelay * Math.pow(2, attempt);
                    console.warn(`ElevenLabs server error (${statusCode}). Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
                    await sleep(delay);
                    continue;
                }
            }
            // Non-retryable error
            throw error;
        }
    }
    throw lastError || new Error('Max retries exceeded');
}
/**
 * Synthesize long text by splitting into chunks.
 */
async function synthesizeChunkedText(client, voiceId, text, settings) {
    const chunks = splitIntoChunks(text, settings.maxChunkSize);
    const audioBuffers = [];
    const allWordTimings = [];
    let currentTimeOffset = 0;
    const SILENCE_GAP = 0.3; // 300ms gap between chunks
    for (let i = 0; i < chunks.length; i++) {
        const result = await synthesizeWithRetry(client, voiceId, chunks[i], {
            model: settings.model,
            stability: settings.stability,
            similarityBoost: settings.similarityBoost,
            style: settings.style,
            useSpeakerBoost: settings.useSpeakerBoost,
        }, settings.maxRetries, settings.retryDelay);
        audioBuffers.push(result.audioBuffer);
        // Adjust word timings with current offset
        const adjustedTimings = result.wordTimings.map((wt) => ({
            word: wt.word,
            start: wt.start + currentTimeOffset,
            end: wt.end + currentTimeOffset,
        }));
        allWordTimings.push(...adjustedTimings);
        // Update offset for next chunk
        if (result.wordTimings.length > 0) {
            const lastTiming = adjustedTimings[adjustedTimings.length - 1];
            currentTimeOffset = lastTiming.end + SILENCE_GAP;
        }
        // Add silence between chunks
        if (i < chunks.length - 1) {
            audioBuffers.push(createSilenceBuffer(SILENCE_GAP));
        }
    }
    return {
        audioBuffer: Buffer.concat(audioBuffers),
        wordTimings: allWordTimings,
        durationSecs: currentTimeOffset,
    };
}
/**
 * Clean text for TTS synthesis.
 * Removes markdown formatting and graphic cues but preserves emotion tags.
 */
function cleanTextForSynthesis(text) {
    return text
        // Remove graphic cues
        .replace(/\[GRAPHIC:[^\]]+\]/g, '')
        // Remove semantic tags like [HOOK], [KEY_POINT], etc.
        .replace(/\[(HOOK|KEY_POINT|EVIDENCE|STORY|TRANSITION|CALLBACK|LANDING|CTA)\]/g, '')
        // Extract pause durations but remove the tags (TTS handles natural pauses)
        .replace(/\[PAUSE:\d+\]/g, ' ')
        // Remove word count metadata
        .replace(/\*\*Word Count:.*$/gim, '')
        .replace(/\*\*.*Word.*Count.*\*\*/gi, '')
        // Remove emphasis markers but keep the text
        .replace(/\*([^*]+)\*/g, '$1')
        // Remove markdown headers
        .replace(/^#.*$/gm, '')
        // Remove horizontal rules
        .replace(/^---+$/gm, '')
        // Collapse multiple newlines
        .replace(/\n{3,}/g, '\n\n')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Split text into chunks on sentence boundaries.
 */
function splitIntoChunks(text, maxChunkSize) {
    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+[\s\n]*|[^.!?]+$/g) || [text];
    let currentChunk = '';
    for (const sentence of sentences) {
        if (sentence.length > maxChunkSize) {
            // Handle very long sentences by splitting on commas
            if (currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            const parts = sentence.split(/,\s*/);
            for (const part of parts) {
                if (currentChunk.length + part.length + 2 > maxChunkSize) {
                    if (currentChunk.length > 0) {
                        chunks.push(currentChunk.trim());
                    }
                    currentChunk = part;
                }
                else {
                    currentChunk += (currentChunk.length > 0 ? ', ' : '') + part;
                }
            }
        }
        else if (currentChunk.length + sentence.length > maxChunkSize) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
        }
        else {
            currentChunk += sentence;
        }
    }
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }
    return chunks.length > 0 ? chunks : [text];
}
/**
 * Parse character-level timestamps into word-level timestamps.
 */
function parseWordTimestamps(characters, startTimes, endTimes) {
    const words = [];
    let currentWord = '';
    let wordStart = 0;
    for (let i = 0; i < characters.length; i++) {
        const char = characters[i];
        if (char === ' ' || char === '\n' || char === '\t') {
            if (currentWord.trim().length > 0) {
                words.push({
                    word: currentWord.trim(),
                    start: wordStart,
                    end: endTimes[i - 1],
                });
            }
            currentWord = '';
            if (i + 1 < startTimes.length) {
                wordStart = startTimes[i + 1];
            }
        }
        else {
            if (currentWord.length === 0) {
                wordStart = startTimes[i];
            }
            currentWord += char;
        }
    }
    // Handle last word
    if (currentWord.trim().length > 0) {
        words.push({
            word: currentWord.trim(),
            start: wordStart,
            end: endTimes[endTimes.length - 1],
        });
    }
    return words;
}
/**
 * Estimate audio duration from MP3 buffer size.
 * Assumes ~128kbps MP3 encoding (16KB per second).
 */
function estimateDurationFromBuffer(buffer) {
    return buffer.length / 16000;
}
/**
 * Create a silence buffer for gaps between chunks.
 * Generates minimal valid MP3 frames of silence.
 */
function createSilenceBuffer(durationSeconds) {
    // Each MP3 frame is ~26ms at 128kbps
    const frameCount = Math.max(1, Math.floor(durationSeconds / 0.026));
    // Minimal valid MP3 frame (silence)
    const silenceFrame = Buffer.from([
        0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const frames = [];
    for (let i = 0; i < frameCount; i++) {
        frames.push(silenceFrame);
    }
    return Buffer.concat(frames);
}
/**
 * Parse Retry-After header value.
 */
function parseRetryAfter(value) {
    if (!value)
        return null;
    const str = Array.isArray(value) ? value[0] : value;
    const seconds = parseInt(str, 10);
    return isNaN(seconds) ? null : seconds * 1000;
}
/**
 * Sleep for specified milliseconds.
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Get available voices from ElevenLabs.
 *
 * @param apiKey - ElevenLabs API key
 * @returns Array of available voices
 */
export async function getElevenLabsVoices(apiKey) {
    const response = await got.get('https://api.elevenlabs.io/v1/voices', {
        headers: {
            'xi-api-key': apiKey,
        },
        responseType: 'json',
    });
    return response.body.voices.map((voice) => ({
        id: voice.voice_id,
        name: voice.name,
        category: voice.category,
    }));
}
//# sourceMappingURL=elevenlabs.js.map