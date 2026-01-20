/**
 * Timeline Builder
 *
 * Generates presentation timelines by synchronizing slides with audio
 * and captions. The timeline is used by video renderers to create
 * properly timed presentations.
 */

import type { TalkTrackV5, SlideDefinition, Section } from '../../parsers/types.js';
import type {
  Timeline,
  TimelineSlide,
  TimelineOptions,
  AudioManifest,
  AudioManifestEntry,
  Caption,
} from './types.js';
import {
  alignCaptionsToAudio,
  estimateCaptionTimings,
  scaleCaptionsToAudioDuration,
} from './caption-sync.js';
import { stripSemanticTags } from '../../parsers/talk-track.js';

// Re-export types
export type {
  Timeline,
  TimelineSlide,
  TimelineOptions,
  AudioManifest,
  AudioManifestEntry,
  Caption,
  WordTiming,
} from './types.js';

// Re-export caption utilities
export {
  splitIntoSentences,
  alignCaptionsToAudio,
  estimateCaptionTimings,
  scaleCaptionsToAudioDuration,
} from './caption-sync.js';

/**
 * Default timeline options.
 */
const DEFAULT_OPTIONS: Required<TimelineOptions> = {
  fps: 30,
  width: 1920,
  height: 1080,
  transitionPadding: 0.3,
};

/**
 * Error thrown when timeline building fails.
 */
export class TimelineBuildError extends Error {
  constructor(
    message: string,
    public readonly errors: string[] = [],
  ) {
    super(message);
    this.name = 'TimelineBuildError';
  }
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
export function buildTimeline(
  talkTrack: TalkTrackV5,
  audioManifest: AudioManifest,
  options?: TimelineOptions,
): Timeline {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: string[] = [];

  // Build section color lookup
  const sectionColors = new Map<string, string>();
  for (const section of talkTrack.sections) {
    sectionColors.set(section.id, section.color);
  }

  // Build timeline slides
  const timelineSlides: TimelineSlide[] = [];
  let currentTime = 0;

  for (const slideDef of talkTrack.slides) {
    const slideContent = talkTrack.slideContent.get(slideDef.slug);
    const audioEntry = audioManifest.entries.get(slideDef.slug);

    // Validate required data
    if (!slideContent) {
      errors.push(`Missing slide content for slug: ${slideDef.slug}`);
      continue;
    }

    if (!audioEntry) {
      errors.push(`Missing audio entry for slug: ${slideDef.slug}`);
      continue;
    }

    // Get section color
    const sectionColor = sectionColors.get(slideDef.section) || '#666666';

    // Calculate slide timing
    const audioDuration = audioEntry.duration;
    const slideDuration = audioDuration + opts.transitionPadding;
    const startTime = currentTime;
    const endTime = currentTime + slideDuration;

    // Generate captions
    const cleanAudioText = stripSemanticTags(slideContent.audioText);
    const captions = buildCaptions(cleanAudioText, audioEntry);

    // Create timeline slide entry
    const timelineSlide: TimelineSlide = {
      slug: slideDef.slug,
      title: slideDef.title,
      section: slideDef.section,
      sectionColor,
      startTime,
      endTime,
      duration: slideDuration,
      imagePath: slideContent.imagePath,
      audioPath: audioEntry.path,
      audioDuration,
      captions,
    };

    timelineSlides.push(timelineSlide);
    currentTime = endTime;
  }

  if (errors.length > 0) {
    throw new TimelineBuildError('Timeline build failed', errors);
  }

  // Calculate total duration
  const totalDuration = timelineSlides.length > 0
    ? timelineSlides[timelineSlides.length - 1].endTime
    : 0;

  return {
    fps: opts.fps,
    width: opts.width,
    height: opts.height,
    totalDuration,
    slides: timelineSlides,
  };
}

/**
 * Builds captions for a slide, using word timings if available.
 */
function buildCaptions(text: string, audioEntry: AudioManifestEntry): Caption[] {
  if (audioEntry.wordTimings && audioEntry.wordTimings.length > 0) {
    // Use precise word timings from ElevenLabs
    return alignCaptionsToAudio(text, audioEntry.wordTimings);
  }

  // Estimate timings for Kokoro (no word-level data)
  const estimatedCaptions = estimateCaptionTimings(text, 0);

  // Scale to match actual audio duration
  return scaleCaptionsToAudioDuration(estimatedCaptions, audioEntry.duration);
}

/**
 * Calculates the total frame count for a timeline.
 *
 * @param timeline - The timeline to calculate frames for
 * @returns Total number of frames
 */
export function calculateTotalFrames(timeline: Timeline): number {
  return Math.ceil(timeline.totalDuration * timeline.fps);
}

/**
 * Gets the slide visible at a specific time.
 *
 * @param timeline - The timeline to search
 * @param time - Time in seconds from video start
 * @returns The slide at that time, or undefined if past end
 */
export function getSlideAtTime(timeline: Timeline, time: number): TimelineSlide | undefined {
  return timeline.slides.find(
    (slide) => time >= slide.startTime && time < slide.endTime,
  );
}

/**
 * Gets the slide visible at a specific frame.
 *
 * @param timeline - The timeline to search
 * @param frame - Frame number (0-indexed)
 * @returns The slide at that frame, or undefined if past end
 */
export function getSlideAtFrame(timeline: Timeline, frame: number): TimelineSlide | undefined {
  const time = frame / timeline.fps;
  return getSlideAtTime(timeline, time);
}

/**
 * Gets the active caption at a specific time within a slide.
 *
 * @param slide - The timeline slide
 * @param time - Time in seconds from video start
 * @returns The active caption, or undefined if none
 */
export function getCaptionAtTime(slide: TimelineSlide, time: number): Caption | undefined {
  // Convert absolute time to slide-relative time
  const relativeTime = time - slide.startTime;

  return slide.captions.find(
    (caption) => relativeTime >= caption.startTime && relativeTime < caption.endTime,
  );
}

/**
 * Formats a duration in seconds as MM:SS or HH:MM:SS.
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generates a timeline summary for debugging/display.
 *
 * @param timeline - The timeline to summarize
 * @returns Human-readable summary string
 */
export function summarizeTimeline(timeline: Timeline): string {
  const lines: string[] = [
    `Timeline Summary`,
    `================`,
    `Resolution: ${timeline.width}x${timeline.height} @ ${timeline.fps}fps`,
    `Total Duration: ${formatDuration(timeline.totalDuration)}`,
    `Total Slides: ${timeline.slides.length}`,
    `Total Frames: ${calculateTotalFrames(timeline)}`,
    ``,
    `Slides:`,
  ];

  for (const slide of timeline.slides) {
    const start = formatDuration(slide.startTime);
    const end = formatDuration(slide.endTime);
    lines.push(`  ${slide.slug}: ${start} - ${end} (${slide.duration.toFixed(1)}s)`);
  }

  return lines.join('\n');
}
