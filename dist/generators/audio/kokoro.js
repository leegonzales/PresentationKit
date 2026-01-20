/**
 * Kokoro TTS Audio Generator
 *
 * Local high-quality TTS synthesis using Kokoro on Apple Silicon via MLX-Audio.
 * Generates audio files for each slide with support for [PAUSE] markers.
 *
 * Note: Kokoro does NOT provide word-level timestamps.
 * Use ElevenLabs generator if captions/subtitles are required.
 */
import { execa } from 'execa';
import { mkdir, readdir, rename, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
/**
 * Path to the claude-speak CLI tool.
 */
const CLAUDE_SPEAK_CLI = resolve(process.env.HOME || '~', 'Projects/claude-speak/.venv/bin/claude-speak');
/**
 * Default pause duration in milliseconds.
 */
const DEFAULT_PAUSE_MS = 750;
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
export function parsePauseMarkers(text) {
    const pattern = /\[PAUSE(?::(\d+))?(?:\s*-[^\]]+)?\]/g;
    const segments = [];
    let lastEnd = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        const segmentText = text.slice(lastEnd, match.index).trim();
        const durationStr = match[1];
        const duration = durationStr ? parseInt(durationStr, 10) : DEFAULT_PAUSE_MS;
        if (segmentText) {
            segments.push({ text: segmentText, pauseAfterMs: duration });
        }
        lastEnd = match.index + match[0].length;
    }
    // Remaining text after last pause marker
    const remaining = text.slice(lastEnd).trim();
    if (remaining) {
        segments.push({ text: remaining, pauseAfterMs: null });
    }
    // If no segments, return the original text
    if (segments.length === 0) {
        segments.push({ text: text.trim(), pauseAfterMs: null });
    }
    return segments;
}
/**
 * Clean text for TTS synthesis.
 * Removes semantic tags and graphic cues but preserves the spoken content.
 */
function cleanTextForSynthesis(text) {
    return text
        // Remove graphic cues
        .replace(/\[GRAPHIC:[^\]]+\]/g, '')
        // Remove semantic tags like [HOOK], [KEY_POINT], etc.
        .replace(/\[(HOOK|KEY_POINT|EVIDENCE|STORY|TRANSITION|CALLBACK|LANDING|CTA)\]/g, '')
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
        // Normalize whitespace (but preserve single spaces)
        .replace(/[ \t]+/g, ' ')
        .trim();
}
/**
 * Generate a silence WAV file of specified duration using ffmpeg.
 *
 * @param durationMs - Duration in milliseconds
 * @param outputFile - Path to write the silence file
 */
async function generateSilence(durationMs, outputFile) {
    const durationSec = durationMs / 1000;
    await execa('ffmpeg', [
        '-y',
        '-f', 'lavfi',
        '-i', `anullsrc=r=24000:cl=mono`,
        '-t', String(durationSec),
        outputFile,
    ]);
}
/**
 * Concatenate multiple WAV files into one using ffmpeg.
 *
 * @param inputFiles - Array of WAV file paths to concatenate
 * @param outputFile - Path for the concatenated output
 */
async function concatenateWavFiles(inputFiles, outputFile) {
    if (inputFiles.length === 0) {
        throw new Error('No input files to concatenate');
    }
    if (inputFiles.length === 1) {
        await rename(inputFiles[0], outputFile);
        return;
    }
    // Create concat list file
    const concatListPath = join(tmpdir(), `concat_${Date.now()}.txt`);
    const concatContent = inputFiles
        .map((f) => `file '${resolve(f)}'`)
        .join('\n');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(concatListPath, concatContent);
    try {
        await execa('ffmpeg', [
            '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', concatListPath,
            '-c', 'copy',
            outputFile,
        ]);
        // Clean up input files
        for (const file of inputFiles) {
            await unlink(file).catch(() => { });
        }
    }
    finally {
        await unlink(concatListPath).catch(() => { });
    }
}
/**
 * Generate TTS audio for a text segment using claude-speak CLI.
 *
 * @param text - Text to synthesize
 * @param outputPrefix - Output file prefix (generates prefix_0.wav, prefix_1.wav, etc.)
 * @param voice - Voice preset
 * @param speed - Speech speed multiplier
 * @returns Array of generated chunk file paths
 */
async function generateTtsChunks(text, outputPrefix, voice, speed) {
    await execa(CLAUDE_SPEAK_CLI, [
        '-v', voice,
        '-s', String(speed),
        '-o', outputPrefix,
        text,
    ]);
    // Find generated chunks (claude-speak creates prefix_0.wav, prefix_1.wav, etc.)
    const dir = join(outputPrefix, '..');
    const prefix = outputPrefix.split('/').pop() || outputPrefix;
    const files = await readdir(resolve(dir));
    const chunks = files
        .filter((f) => f.startsWith(`${prefix}_`) && f.endsWith('.wav'))
        .sort()
        .map((f) => join(resolve(dir), f));
    return chunks;
}
/**
 * Generate audio for a single text segment, handling chunking by Kokoro.
 *
 * @param text - Text to synthesize
 * @param outputPrefix - Temporary output prefix
 * @param voice - Voice preset
 * @param speed - Speech speed
 * @returns Path to the concatenated segment audio file
 */
async function generateSegmentAudio(text, outputPrefix, voice, speed) {
    const chunks = await generateTtsChunks(text, outputPrefix, voice, speed);
    if (chunks.length === 0) {
        throw new Error('No audio chunks generated');
    }
    if (chunks.length === 1) {
        return chunks[0];
    }
    // Concatenate multiple chunks
    const segmentOutput = `${outputPrefix}_merged.wav`;
    await concatenateWavFiles(chunks, segmentOutput);
    return segmentOutput;
}
/**
 * Generate audio for text with pause markers.
 *
 * @param text - Text with potential [PAUSE] markers
 * @param outputFile - Final output file path
 * @param voice - Voice preset
 * @param speed - Speech speed
 */
async function generateAudioWithPauses(text, outputFile, voice, speed) {
    const segments = parsePauseMarkers(text);
    // Simple case: no pauses
    if (segments.length === 1 && segments[0].pauseAfterMs === null) {
        const tempPrefix = outputFile.replace('.wav', '_temp');
        const segmentFile = await generateSegmentAudio(segments[0].text, tempPrefix, voice, speed);
        await rename(segmentFile, outputFile);
        return;
    }
    // Complex case: multiple segments with pauses
    const tempDir = join(tmpdir(), `kokoro_${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    const allFiles = [];
    try {
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const segmentPrefix = join(tempDir, `seg_${String(i).padStart(3, '0')}`);
            // Generate audio for this segment
            const segmentFile = await generateSegmentAudio(segment.text, segmentPrefix, voice, speed);
            const finalSegmentFile = join(tempDir, `part_${String(allFiles.length).padStart(3, '0')}.wav`);
            await rename(segmentFile, finalSegmentFile);
            allFiles.push(finalSegmentFile);
            // Add silence if needed
            if (segment.pauseAfterMs !== null) {
                const silenceFile = join(tempDir, `part_${String(allFiles.length).padStart(3, '0')}.wav`);
                await generateSilence(segment.pauseAfterMs, silenceFile);
                allFiles.push(silenceFile);
            }
        }
        // Concatenate all parts
        await concatenateWavFiles(allFiles, outputFile);
    }
    finally {
        // Clean up temp directory
        const { rm } = await import('node:fs/promises');
        await rm(tempDir, { recursive: true, force: true }).catch(() => { });
    }
}
/**
 * Get audio duration in seconds using ffprobe.
 *
 * @param audioPath - Path to the audio file
 * @returns Duration in seconds
 */
async function getAudioDuration(audioPath) {
    const { stdout } = await execa('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        audioPath,
    ]);
    return parseFloat(stdout.trim()) || 0;
}
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
export async function generateKokoroAudio(slides, options) {
    const { outputDir, voice = 'af_heart', speed = 1.0, onProgress, } = options;
    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });
    const results = [];
    let totalDurationSecs = 0;
    let totalCharacters = 0;
    const slidesWithAudio = slides.filter((s) => s.audioText && s.audioText.trim().length > 0);
    for (let i = 0; i < slidesWithAudio.length; i++) {
        const slide = slidesWithAudio[i];
        const progress = (i + 1) / slidesWithAudio.length;
        if (onProgress) {
            onProgress(slide.slug, progress);
        }
        const cleanText = cleanTextForSynthesis(slide.audioText);
        const characterCount = cleanText.length;
        totalCharacters += characterCount;
        const audioFilename = `${slide.slug}.wav`;
        const audioPath = join(outputDir, audioFilename);
        try {
            await generateAudioWithPauses(cleanText, audioPath, voice, speed);
            const durationSecs = await getAudioDuration(audioPath);
            totalDurationSecs += durationSecs;
            results.push({
                slideSlug: slide.slug,
                audioPath,
                durationSecs,
                characterCount,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Failed to generate audio for slide "${slide.slug}": ${message}`);
            // Continue with other slides but record the failure
            results.push({
                slideSlug: slide.slug,
                audioPath: '',
                durationSecs: 0,
                characterCount,
            });
        }
    }
    return {
        totalDurationSecs,
        totalCharacters,
        slides: results,
    };
}
/**
 * List available Kokoro voices.
 *
 * @returns Array of voice information
 */
export async function getKokoroVoices() {
    return [
        // American English Female
        { id: 'af_heart', name: 'Heart', category: 'American Female' },
        { id: 'af_bella', name: 'Bella', category: 'American Female' },
        { id: 'af_nova', name: 'Nova', category: 'American Female' },
        { id: 'af_sky', name: 'Sky', category: 'American Female' },
        // American English Male
        { id: 'am_adam', name: 'Adam', category: 'American Male' },
        { id: 'am_echo', name: 'Echo', category: 'American Male' },
        // British English
        { id: 'bf_alice', name: 'Alice', category: 'British Female' },
        { id: 'bf_emma', name: 'Emma', category: 'British Female' },
        { id: 'bm_daniel', name: 'Daniel', category: 'British Male' },
        { id: 'bm_george', name: 'George', category: 'British Male' },
    ];
}
//# sourceMappingURL=kokoro.js.map