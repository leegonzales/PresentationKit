/**
 * Timeline Builder
 *
 * Generates presentation timelines by synchronizing slides with audio
 * and captions. The timeline is used by video renderers to create
 * properly timed presentations.
 */
import type { TalkTrackV5 } from '../../parsers/types.js';
import type { Timeline, TimelineSlide, TimelineOptions, AudioManifest, Caption } from './types.js';
export type { Timeline, TimelineSlide, TimelineOptions, AudioManifest, AudioManifestEntry, Caption, WordTiming, } from './types.js';
export { splitIntoSentences, alignCaptionsToAudio, estimateCaptionTimings, scaleCaptionsToAudioDuration, } from './caption-sync.js';
/**
 * Error thrown when timeline building fails.
 */
export declare class TimelineBuildError extends Error {
    readonly errors: string[];
    constructor(message: string, errors?: string[]);
}
/**
 * Builds a complete presentation timeline from talk track and audio manifest.
 *
 * The timeline synchronizes:
 * - Slide images with their display durations
 * - Audio playback with slide transitions
 * - Captions with audio (word-level if available)
 *
 * @param talkTrack - Parsed Talk Track v5 document
 * @param audioManifest - Generated audio manifest with durations
 * @param options - Timeline options (fps, dimensions, transition padding)
 * @returns Complete timeline for video rendering
 *
 * @example
 * ```typescript
 * import { parseTalkTrack } from '../parsers/talk-track.js';
 * import { buildTimeline } from '../generators/timeline/index.js';
 *
 * const talkTrack = parseTalkTrack(markdownContent);
 * const audioManifest = await generateAudio(talkTrack);
 *
 * const timeline = buildTimeline(talkTrack, audioManifest, {
 *   fps: 30,
 *   width: 1920,
 *   height: 1080,
 *   transitionPadding: 0.3,
 * });
 *
 * console.log(`Total duration: ${timeline.totalDuration}s`);
 * console.log(`Slides: ${timeline.slides.length}`);
 * ```
 */
export declare function buildTimeline(talkTrack: TalkTrackV5, audioManifest: AudioManifest, options?: TimelineOptions): Timeline;
/**
 * Calculates the total frame count for a timeline.
 *
 * @param timeline - The timeline to calculate frames for
 * @returns Total number of frames
 */
export declare function calculateTotalFrames(timeline: Timeline): number;
/**
 * Gets the slide visible at a specific time.
 *
 * @param timeline - The timeline to search
 * @param time - Time in seconds from video start
 * @returns The slide at that time, or undefined if past end
 */
export declare function getSlideAtTime(timeline: Timeline, time: number): TimelineSlide | undefined;
/**
 * Gets the slide visible at a specific frame.
 *
 * @param timeline - The timeline to search
 * @param frame - Frame number (0-indexed)
 * @returns The slide at that frame, or undefined if past end
 */
export declare function getSlideAtFrame(timeline: Timeline, frame: number): TimelineSlide | undefined;
/**
 * Gets the active caption at a specific time within a slide.
 *
 * @param slide - The timeline slide
 * @param time - Time in seconds from video start
 * @returns The active caption, or undefined if none
 */
export declare function getCaptionAtTime(slide: TimelineSlide, time: number): Caption | undefined;
/**
 * Formats a duration in seconds as MM:SS or HH:MM:SS.
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export declare function formatDuration(seconds: number): string;
/**
 * Generates a timeline summary for debugging/display.
 *
 * @param timeline - The timeline to summarize
 * @returns Human-readable summary string
 */
export declare function summarizeTimeline(timeline: Timeline): string;
//# sourceMappingURL=index.d.ts.map