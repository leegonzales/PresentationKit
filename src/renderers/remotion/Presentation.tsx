/**
 * Presentation Composition
 *
 * Main Remotion composition for rendering presentation videos.
 * Maps timeline data to slide sequences with synchronized audio and captions.
 */

import React, { type FC, useMemo } from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  interpolate,
} from 'remotion';
import type { PresentationProps, TimelineSlide } from './types.js';
import { DEFAULT_TRANSITION_DURATION } from './types.js';
import { Slide } from './components/Slide.js';
import { CaptionOverlay } from './components/CaptionOverlay.js';
import { SlideTransition } from './components/Transition.js';

/**
 * Progress bar component showing presentation progress.
 */
interface ProgressBarProps {
  /** Current progress (0-1) */
  progress: number;
  /** Section color for the progress bar */
  sectionColor?: string;
}

const ProgressBar: FC<ProgressBarProps> = ({ progress, sectionColor = '#ffffff' }) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress * 100}%`,
          backgroundColor: sectionColor,
          boxShadow: `0 0 10px ${sectionColor}80`,
          transition: 'width 0.1s linear',
        }}
      />
    </div>
  );
};

/**
 * Slide number indicator component.
 */
interface SlideIndicatorProps {
  /** Current slide number (1-indexed) */
  current: number;
  /** Total number of slides */
  total: number;
}

const SlideIndicator: FC<SlideIndicatorProps> = ({ current, total }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        right: 30,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.6)',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '8px 16px',
        borderRadius: 6,
        fontWeight: 500,
      }}
    >
      {current} / {total}
    </div>
  );
};

/**
 * Format seconds to MM:SS display format.
 */
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Time display component showing elapsed time.
 */
interface TimeDisplayProps {
  /** Current time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  totalDuration: number;
}

const TimeDisplay: FC<TimeDisplayProps> = ({ currentTime, totalDuration }) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: 30,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.6)',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '6px 12px',
        borderRadius: 6,
        fontWeight: 500,
      }}
    >
      {formatTime(currentTime)} / {formatTime(totalDuration)}
    </div>
  );
};

/**
 * Single slide sequence component.
 * Renders a slide with its captions and transition effects.
 */
interface SlideSequenceProps {
  /** Slide data from timeline */
  slide: TimelineSlide;
  /** Base path for assets */
  assetsPath: string;
  /** Duration of this slide in frames */
  durationInFrames: number;
  /** Slide index (0-based) */
  slideIndex: number;
  /** Total number of slides */
  totalSlides: number;
}

const SlideSequence: FC<SlideSequenceProps> = ({
  slide,
  assetsPath,
  durationInFrames,
  slideIndex,
  totalSlides,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate current time relative to slide start (in seconds)
  const currentTime = frame / fps;

  return (
    <AbsoluteFill>
      {/* Slide transition wrapper */}
      <SlideTransition
        durationInFrames={durationInFrames}
        type="fade"
        transitionDuration={DEFAULT_TRANSITION_DURATION}
      >
        {/* Slide image with section indicator */}
        <Slide slide={slide} assetsPath={assetsPath} isActive={true} />

        {/* Audio for this slide - use staticFile for relative paths, direct for absolute */}
        {slide.audioPath && (
          <Audio
            src={
              slide.audioPath.startsWith('/')
                ? slide.audioPath
                : staticFile(slide.audioPath)
            }
          />
        )}

        {/* Caption overlay */}
        <CaptionOverlay
          captions={slide.captions}
          currentTime={currentTime}
          showWordHighlight={true}
        />

        {/* Slide number indicator */}
        <SlideIndicator current={slideIndex + 1} total={totalSlides} />
      </SlideTransition>
    </AbsoluteFill>
  );
};

/**
 * Main Presentation Composition
 *
 * Renders the complete presentation video by:
 * 1. Mapping timeline slides to Remotion sequences
 * 2. Handling audio playback synchronization
 * 3. Rendering captions over slides
 * 4. Managing slide transitions
 */
export const Presentation: FC<PresentationProps> = ({ timeline, assetsPath }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Current playback time in seconds
  const currentTime = frame / fps;

  // Find the current slide based on time
  const currentSlide = useMemo(() => {
    return timeline.slides.find(
      (slide: TimelineSlide) => currentTime >= slide.startTime && currentTime < slide.endTime
    );
  }, [timeline.slides, currentTime]);

  // Current slide index for progress calculation
  const currentSlideIndex = currentSlide
    ? timeline.slides.findIndex((s: TimelineSlide) => s.slug === currentSlide.slug)
    : 0;

  // Calculate overall progress
  const progress = currentTime / timeline.totalDuration;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Render each slide as a Remotion Sequence */}
      {timeline.slides.map((slide: TimelineSlide, index: number) => {
        // Convert slide timing to frames
        const startFrame = Math.floor(slide.startTime * fps);
        const slideFrames = Math.floor(slide.duration * fps);

        return (
          <Sequence
            key={slide.slug}
            from={startFrame}
            durationInFrames={slideFrames}
          >
            <SlideSequence
              slide={slide}
              assetsPath={assetsPath}
              durationInFrames={slideFrames}
              slideIndex={index}
              totalSlides={timeline.slides.length}
            />
          </Sequence>
        );
      })}

      {/* Global progress bar */}
      <ProgressBar
        progress={progress}
        sectionColor={currentSlide?.sectionColor || '#ffffff'}
      />

      {/* Time display */}
      <TimeDisplay
        currentTime={currentTime}
        totalDuration={timeline.totalDuration}
      />
    </AbsoluteFill>
  );
};

/**
 * Presentation composition with concatenated audio track.
 *
 * Alternative composition that uses a single concatenated audio file
 * instead of per-slide audio. This is useful when slides have been
 * combined into a single audio track.
 */
interface PresentationWithAudioTrackProps extends PresentationProps {
  /** Path to the concatenated audio file */
  audioTrackPath: string;
}

export const PresentationWithAudioTrack: FC<PresentationWithAudioTrackProps> = ({
  timeline,
  assetsPath,
  audioTrackPath,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentTime = frame / fps;

  const currentSlide = useMemo(() => {
    return timeline.slides.find(
      (slide: TimelineSlide) => currentTime >= slide.startTime && currentTime < slide.endTime
    );
  }, [timeline.slides, currentTime]);

  const progress = currentTime / timeline.totalDuration;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Single audio track for the entire presentation */}
      <Audio src={staticFile(audioTrackPath)} />

      {/* Render slides without individual audio */}
      {timeline.slides.map((slide: TimelineSlide, index: number) => {
        const startFrame = Math.floor(slide.startTime * fps);
        const slideFrames = Math.floor(slide.duration * fps);

        // Calculate caption time relative to absolute time, not slide start
        const captionCurrentTime = currentTime - slide.startTime;

        return (
          <Sequence
            key={slide.slug}
            from={startFrame}
            durationInFrames={slideFrames}
          >
            <AbsoluteFill>
              <SlideTransition
                durationInFrames={slideFrames}
                type="fade"
                transitionDuration={DEFAULT_TRANSITION_DURATION}
              >
                <Slide slide={slide} assetsPath={assetsPath} isActive={true} />

                {/* Captions use slide-relative time for proper synchronization */}
                <CaptionOverlay
                  captions={slide.captions}
                  currentTime={Math.max(0, captionCurrentTime)}
                  showWordHighlight={true}
                />

                <SlideIndicator current={index + 1} total={timeline.slides.length} />
              </SlideTransition>
            </AbsoluteFill>
          </Sequence>
        );
      })}

      <ProgressBar
        progress={progress}
        sectionColor={currentSlide?.sectionColor || '#ffffff'}
      />

      <TimeDisplay
        currentTime={currentTime}
        totalDuration={timeline.totalDuration}
      />
    </AbsoluteFill>
  );
};

export default Presentation;
