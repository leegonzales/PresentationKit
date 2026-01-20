/**
 * Remotion Root
 *
 * Composition registry for PresentationKit video rendering.
 * This file is the entry point for Remotion's bundler.
 */

import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { Presentation, PresentationWithAudioTrack } from './Presentation.js';
import type { PresentationProps, Timeline } from './types.js';
import { DEFAULT_VIDEO_CONFIG } from './types.js';

/**
 * Create default timeline for preview/development.
 */
const createDefaultTimeline = (): Timeline => ({
  fps: 30,
  width: 1920,
  height: 1080,
  totalDuration: 10, // 10 seconds preview
  slides: [
    {
      slug: 'preview-slide',
      title: 'Preview Slide',
      section: 'preview',
      sectionColor: '#4285F4',
      startTime: 0,
      endTime: 10,
      duration: 10,
      imagePath: '/images/preview.png',
      audioPath: '',
      audioDuration: 10,
      captions: [
        {
          text: 'This is a preview caption for development.',
          startTime: 1,
          endTime: 5,
        },
        {
          text: 'Captions synchronize with the audio.',
          startTime: 5,
          endTime: 9,
        },
      ],
    },
  ],
});

/**
 * Default props for preview rendering.
 */
const defaultProps: PresentationProps = {
  timeline: createDefaultTimeline(),
  assetsPath: 'public',
};

/**
 * Calculate video configuration from props.
 * Extracts fps, dimensions, and duration from the timeline.
 */
const calculateMetadata = ({ props }: { props: unknown }) => {
  const typedProps = props as PresentationProps;
  const { timeline } = typedProps;

  return {
    durationInFrames: Math.ceil(timeline.totalDuration * timeline.fps),
    fps: timeline.fps,
    width: timeline.width,
    height: timeline.height,
  };
};

/**
 * RemotionRoot Component
 *
 * Registers all available compositions for rendering:
 * - Presentation: Standard presentation with per-slide audio
 * - PresentationSingleTrack: Presentation with concatenated audio track
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Standard Presentation - per-slide audio files */}
      <Composition
        id="Presentation"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={Presentation as any}
        durationInFrames={Math.ceil(defaultProps.timeline.totalDuration * defaultProps.timeline.fps)}
        fps={defaultProps.timeline.fps}
        width={defaultProps.timeline.width}
        height={defaultProps.timeline.height}
        defaultProps={defaultProps}
        calculateMetadata={calculateMetadata}
      />

      {/* Presentation with single concatenated audio track */}
      <Composition
        id="PresentationSingleTrack"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={PresentationWithAudioTrack as any}
        durationInFrames={Math.ceil(defaultProps.timeline.totalDuration * defaultProps.timeline.fps)}
        fps={defaultProps.timeline.fps}
        width={defaultProps.timeline.width}
        height={defaultProps.timeline.height}
        defaultProps={{
          ...defaultProps,
          audioTrackPath: '/audio/presentation.mp3',
        }}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};

// Register root component for Remotion v4
registerRoot(RemotionRoot);

// Export for programmatic usage
export { Presentation, PresentationWithAudioTrack };
export type { PresentationProps, Timeline };
