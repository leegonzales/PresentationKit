/**
 * Remotion Video Renderer
 *
 * Renders presentation timelines to video using Remotion.
 * Handles bundling, composition setup, and media rendering.
 */
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { writeFileSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { QUALITY_PRESETS, CODEC_MAP } from './types.js';
/**
 * Error thrown when video rendering fails.
 */
export class VideoRenderError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'VideoRenderError';
    }
}
/**
 * Default render options.
 */
const DEFAULT_OPTIONS = {
    quality: '1080p',
    codec: 'h264',
    crf: 23,
};
/**
 * Validates render options.
 */
function validateOptions(options) {
    // Validate CRF range
    if (options.crf < 0 || options.crf > 51) {
        throw new VideoRenderError(`Invalid CRF value: ${options.crf}. Must be between 0 and 51.`);
    }
    // Recommend CRF range for quality
    if (options.crf < 18) {
        console.warn(`Warning: CRF ${options.crf} produces very large files. Recommended range: 18-28.`);
    }
    else if (options.crf > 28) {
        console.warn(`Warning: CRF ${options.crf} may result in noticeable quality loss. Recommended range: 18-28.`);
    }
    // Validate output path has a valid extension
    const validExtensions = ['.mp4', '.webm', '.mkv'];
    const ext = options.outputPath.toLowerCase().slice(-4);
    if (!validExtensions.some((e) => options.outputPath.toLowerCase().endsWith(e))) {
        throw new VideoRenderError(`Invalid output file extension. Supported: ${validExtensions.join(', ')}`);
    }
    // Validate codec/container compatibility
    if ((options.codec === 'vp8' || options.codec === 'vp9') && ext === '.mp4') {
        throw new VideoRenderError(`Codec ${options.codec} is not compatible with MP4 container. Use .webm instead.`);
    }
}
/**
 * Creates a temporary directory for render artifacts.
 */
function createTempDir() {
    const tempDir = join(tmpdir(), `pk-render-${randomUUID()}`);
    mkdirSync(tempDir, { recursive: true });
    return tempDir;
}
/**
 * Writes timeline data to a temporary JSON file.
 */
function writeTimelineProps(tempDir, timeline, assetsPath) {
    const propsPath = join(tempDir, 'timeline-props.json');
    const props = {
        timeline,
        assetsPath: resolve(assetsPath),
    };
    writeFileSync(propsPath, JSON.stringify(props, null, 2));
    return propsPath;
}
/**
 * Cleans up temporary files and directories.
 */
function cleanup(tempDir, bundlePath) {
    try {
        if (existsSync(tempDir)) {
            rmSync(tempDir, { recursive: true, force: true });
        }
        if (bundlePath && existsSync(bundlePath)) {
            rmSync(bundlePath, { recursive: true, force: true });
        }
    }
    catch (error) {
        // Log but don't throw on cleanup errors
        console.warn('Warning: Failed to clean up temp files:', error);
    }
}
/**
 * Gets the Remotion entry point path.
 * Assumes the composition is defined in a standard location.
 */
function getEntryPoint() {
    // Look for the Remotion entry point relative to this file
    // In production, this would be in the package's remotion directory
    const possiblePaths = [
        join(dirname(import.meta.url.replace('file://', '')), 'composition.tsx'),
        join(process.cwd(), 'src', 'renderers', 'remotion', 'composition.tsx'),
        join(process.cwd(), 'remotion', 'index.tsx'),
    ];
    for (const p of possiblePaths) {
        if (existsSync(p)) {
            return p;
        }
    }
    throw new VideoRenderError('Could not find Remotion entry point. Expected composition.tsx in the remotion directory.');
}
/**
 * Renders a presentation timeline to video.
 *
 * Uses Remotion to render the timeline with all assets (images, audio)
 * into a video file.
 *
 * @param timeline - The presentation timeline to render
 * @param assetsPath - Base path where slide images and audio files are located
 * @param options - Render options (quality, codec, crf, output path)
 * @returns Promise resolving to the output path and duration
 *
 * @example
 * ```typescript
 * import { renderVideo } from './renderer.js';
 * import { buildTimeline } from '../../generators/timeline/index.js';
 *
 * const timeline = buildTimeline(talkTrack, audioManifest);
 *
 * const result = await renderVideo(timeline, './public', {
 *   quality: '1080p',
 *   codec: 'h264',
 *   crf: 23,
 *   outputPath: './output/presentation.mp4',
 *   onProgress: (progress) => {
 *     console.log(`Rendering: ${(progress * 100).toFixed(1)}%`);
 *   },
 * });
 *
 * console.log(`Video rendered to ${result.outputPath}`);
 * console.log(`Duration: ${result.durationSecs}s`);
 * ```
 */
export async function renderVideo(timeline, assetsPath, options) {
    // Merge with defaults
    const opts = {
        ...DEFAULT_OPTIONS,
        ...options,
    };
    // Validate options
    validateOptions(opts);
    // Create temp directory for artifacts
    const tempDir = createTempDir();
    let bundlePath;
    try {
        // Write timeline props to temp file
        const propsPath = writeTimelineProps(tempDir, timeline, assetsPath);
        // Get the entry point for bundling
        const entryPoint = getEntryPoint();
        // Report initial progress
        opts.onProgress?.(0);
        // Bundle the Remotion project
        console.log('Bundling Remotion project...');
        bundlePath = await bundle({
            entryPoint,
            // Enable caching for faster subsequent renders
            webpackOverride: (config) => config,
        });
        opts.onProgress?.(0.1);
        // Get composition metadata
        const resolution = QUALITY_PRESETS[opts.quality];
        const durationInFrames = Math.ceil(timeline.totalDuration * timeline.fps);
        // Select the composition
        const composition = await selectComposition({
            serveUrl: bundlePath,
            id: 'Presentation',
            inputProps: {
                timelinePath: propsPath,
                assetsPath: resolve(assetsPath),
            },
        });
        // Override composition settings with our timeline data
        const compositionWithSettings = {
            ...composition,
            width: resolution.width,
            height: resolution.height,
            fps: timeline.fps,
            durationInFrames,
        };
        opts.onProgress?.(0.15);
        // Ensure output directory exists
        const outputDir = dirname(opts.outputPath);
        if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
        }
        // Render the video
        console.log(`Rendering video to ${opts.outputPath}...`);
        console.log(`Resolution: ${resolution.width}x${resolution.height}`);
        console.log(`Codec: ${opts.codec}, CRF: ${opts.crf}`);
        console.log(`Duration: ${timeline.totalDuration.toFixed(1)}s, Frames: ${durationInFrames}`);
        await renderMedia({
            composition: compositionWithSettings,
            serveUrl: bundlePath,
            outputLocation: opts.outputPath,
            codec: CODEC_MAP[opts.codec],
            crf: opts.crf,
            inputProps: {
                timelinePath: propsPath,
                assetsPath: resolve(assetsPath),
            },
            onProgress: ({ progress }) => {
                // Scale progress from 0.15 to 1.0
                const scaledProgress = 0.15 + progress * 0.85;
                opts.onProgress?.(scaledProgress);
            },
        });
        opts.onProgress?.(1);
        return {
            outputPath: opts.outputPath,
            durationSecs: timeline.totalDuration,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new VideoRenderError(`Video render failed: ${message}`, error);
    }
    finally {
        // Clean up temp files
        cleanup(tempDir, bundlePath);
    }
}
/**
 * Renders a video with preset quality settings.
 *
 * Convenience wrapper that applies recommended settings for common use cases.
 *
 * @param timeline - The presentation timeline to render
 * @param assetsPath - Base path for assets
 * @param outputPath - Output video file path
 * @param quality - Quality preset (720p, 1080p, 4k)
 * @param onProgress - Optional progress callback
 * @returns Promise resolving to the render result
 */
export async function renderVideoWithPreset(timeline, assetsPath, outputPath, quality = '1080p', onProgress) {
    // Determine codec based on output extension
    const isWebm = outputPath.toLowerCase().endsWith('.webm');
    const codec = isWebm ? 'vp9' : 'h264';
    // Use quality-appropriate CRF
    const crfMap = {
        '720p': 25,
        '1080p': 23,
        '4k': 20,
    };
    return renderVideo(timeline, assetsPath, {
        quality,
        codec,
        crf: crfMap[quality],
        outputPath,
        onProgress,
    });
}
/**
 * Estimates the render time for a timeline.
 *
 * Based on empirical data, provides a rough estimate of render duration.
 * Actual times vary based on hardware and complexity.
 *
 * @param timeline - The timeline to estimate
 * @param quality - Target quality preset
 * @returns Estimated render time in seconds
 */
export function estimateRenderTime(timeline, quality) {
    // Base multipliers per quality (seconds of render per second of video)
    const multipliers = {
        '720p': 0.5,
        '1080p': 1.0,
        '4k': 4.0,
    };
    // Add overhead for bundling and setup
    const overhead = 30;
    return timeline.totalDuration * multipliers[quality] + overhead;
}
//# sourceMappingURL=renderer.js.map