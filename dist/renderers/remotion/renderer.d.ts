/**
 * Remotion Video Renderer
 *
 * Renders presentation timelines to video using Remotion.
 * Handles bundling, composition setup, and media rendering.
 */
import type { Timeline } from '../../generators/timeline/types.js';
import type { VideoRenderOptions, VideoRenderResult, VideoQuality } from './types.js';
/**
 * Error thrown when video rendering fails.
 */
export declare class VideoRenderError extends Error {
    readonly cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
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
export declare function renderVideo(timeline: Timeline, assetsPath: string, options: VideoRenderOptions): Promise<VideoRenderResult>;
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
export declare function renderVideoWithPreset(timeline: Timeline, assetsPath: string, outputPath: string, quality?: VideoQuality, onProgress?: (progress: number) => void): Promise<VideoRenderResult>;
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
export declare function estimateRenderTime(timeline: Timeline, quality: VideoQuality): number;
//# sourceMappingURL=renderer.d.ts.map