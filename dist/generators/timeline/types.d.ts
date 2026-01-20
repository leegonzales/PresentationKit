/**
 * Timeline Types
 *
 * Type definitions for the presentation timeline that synchronizes
 * slides, audio, and captions for video rendering.
 */
/**
 * Word-level timing information from TTS providers like ElevenLabs.
 */
export interface WordTiming {
    /** The word text */
    word: string;
    /** Start time in seconds relative to slide audio start */
    start: number;
    /** End time in seconds relative to slide audio start */
    end: number;
}
/**
 * Caption segment with timing information.
 * Represents a sentence or phrase to display as a caption.
 */
export interface Caption {
    /** Caption text (typically a sentence or phrase) */
    text: string;
    /** Start time in seconds relative to slide start */
    startTime: number;
    /** End time in seconds relative to slide start */
    endTime: number;
    /** Word-level timings for animated captions (optional) */
    words?: WordTiming[];
}
/**
 * Timeline data for a single slide.
 */
export interface TimelineSlide {
    /** Unique slide identifier */
    slug: string;
    /** Slide title */
    title: string;
    /** Section ID this slide belongs to */
    section: string;
    /** Section color for visual theming */
    sectionColor: string;
    /** Slide start time in seconds from video start */
    startTime: number;
    /** Slide end time in seconds from video start */
    endTime: number;
    /** Slide duration in seconds (endTime - startTime) */
    duration: number;
    /** Path to slide image file */
    imagePath: string;
    /** Path to generated audio file */
    audioPath: string;
    /** Audio duration in seconds (excluding transition padding) */
    audioDuration: number;
    /** Caption segments for this slide */
    captions: Caption[];
}
/**
 * Complete timeline for video rendering.
 */
export interface Timeline {
    /** Frames per second for video rendering */
    fps: number;
    /** Video width in pixels */
    width: number;
    /** Video height in pixels */
    height: number;
    /** Total video duration in seconds */
    totalDuration: number;
    /** Slide timeline entries */
    slides: TimelineSlide[];
}
/**
 * Options for timeline generation.
 */
export interface TimelineOptions {
    /** Frames per second (default: 30) */
    fps?: number;
    /** Video width in pixels (default: 1920) */
    width?: number;
    /** Video height in pixels (default: 1080) */
    height?: number;
    /** Transition padding between slides in seconds (default: 0.3) */
    transitionPadding?: number;
}
/**
 * Audio manifest entry for a single slide.
 * Contains path and metadata about generated audio.
 */
export interface AudioManifestEntry {
    /** Slide slug */
    slug: string;
    /** Path to the audio file */
    path: string;
    /** Audio duration in seconds */
    duration: number;
    /** TTS provider used */
    provider: 'kokoro' | 'elevenlabs';
    /** Word-level timings (ElevenLabs only) */
    wordTimings?: WordTiming[];
}
/**
 * Complete audio manifest from audio generation phase.
 */
export interface AudioManifest {
    /** Voice ID used for generation */
    voice: string;
    /** TTS provider */
    provider: 'kokoro' | 'elevenlabs';
    /** Audio entries indexed by slug */
    entries: Map<string, AudioManifestEntry>;
}
//# sourceMappingURL=types.d.ts.map