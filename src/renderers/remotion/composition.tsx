/**
 * Remotion Composition
 *
 * Main composition component for rendering presentations with Remotion.
 * Reads timeline data from props and renders slides with audio and captions.
 */

import React from 'react';
import {
  Composition,
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from 'remotion';
import { readFileSync } from 'node:fs';

import type { Timeline, TimelineSlide, Caption } from '../../generators/timeline/types.js';
import type { CompositionProps } from './types.js';

/**
 * Props passed to the presentation component.
 */
interface PresentationProps {
  timeline: Timeline;
  assetsPath: string;
}

/**
 * Loads timeline from the props file path.
 */
function loadTimelineFromProps(propsPath: string): { timeline: Timeline; assetsPath: string } {
  const content = readFileSync(propsPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Caption display component with fade animations.
 */
const CaptionDisplay: React.FC<{
  slide: TimelineSlide;
  relativeFrame: number;
  fps: number;
}> = ({ slide, relativeFrame, fps }) => {
  const relativeTime = relativeFrame / fps;

  // Find active caption
  const activeCaption = slide.captions.find(
    (caption) => relativeTime >= caption.startTime && relativeTime < caption.endTime,
  );

  if (!activeCaption) {
    return null;
  }

  // Calculate fade in/out
  const captionDuration = activeCaption.endTime - activeCaption.startTime;
  const fadeInDuration = Math.min(0.2, captionDuration * 0.2);
  const fadeOutDuration = Math.min(0.2, captionDuration * 0.2);

  const timeInCaption = relativeTime - activeCaption.startTime;
  const timeToEnd = activeCaption.endTime - relativeTime;

  let opacity = 1;
  if (timeInCaption < fadeInDuration) {
    opacity = timeInCaption / fadeInDuration;
  } else if (timeToEnd < fadeOutDuration) {
    opacity = timeToEnd / fadeOutDuration;
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '10%',
        left: '5%',
        right: '5%',
        textAlign: 'center',
        opacity,
      }}
    >
      <div
        style={{
          display: 'inline-block',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          padding: '16px 32px',
          borderRadius: '8px',
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: '32px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 500,
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
          }}
        >
          {activeCaption.text}
        </span>
      </div>
    </div>
  );
};

/**
 * Individual slide component.
 */
const SlideComponent: React.FC<{
  slide: TimelineSlide;
  assetsPath: string;
  fps: number;
}> = ({ slide, assetsPath, fps }) => {
  const frame = useCurrentFrame();
  const durationInFrames = Math.ceil(slide.duration * fps);

  // Calculate fade transitions
  const fadeInFrames = Math.ceil(0.3 * fps);
  const fadeOutFrames = Math.ceil(0.3 * fps);

  const opacity = interpolate(
    frame,
    [0, fadeInFrames, durationInFrames - fadeOutFrames, durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  // Resolve paths
  const imagePath = slide.imagePath.startsWith('/')
    ? slide.imagePath
    : `${assetsPath}/${slide.imagePath}`;
  const audioPath = slide.audioPath.startsWith('/')
    ? slide.audioPath
    : `${assetsPath}/${slide.audioPath}`;

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Background with section color */}
      <AbsoluteFill
        style={{
          backgroundColor: slide.sectionColor || '#1a1a1a',
        }}
      />

      {/* Slide image */}
      <AbsoluteFill
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Img
          src={imagePath}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
      </AbsoluteFill>

      {/* Audio */}
      <Audio src={audioPath} />

      {/* Captions */}
      <CaptionDisplay slide={slide} relativeFrame={frame} fps={fps} />
    </AbsoluteFill>
  );
};

/**
 * Main presentation composition.
 */
const Presentation: React.FC<CompositionProps> = ({ timelinePath, assetsPath }) => {
  // Load timeline data
  const { timeline, assetsPath: resolvedAssetsPath } = loadTimelineFromProps(timelinePath);
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {timeline.slides.map((slide) => {
        const startFrame = Math.floor(slide.startTime * fps);
        const durationInFrames = Math.ceil(slide.duration * fps);

        return (
          <Sequence
            key={slide.slug}
            from={startFrame}
            durationInFrames={durationInFrames}
            name={slide.title}
          >
            <SlideComponent
              slide={slide}
              assetsPath={resolvedAssetsPath || assetsPath}
              fps={fps}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Root component that registers the composition with Remotion.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Presentation"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={Presentation as any}
        durationInFrames={300} // Will be overridden at render time
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          timelinePath: '',
          assetsPath: '',
        } satisfies CompositionProps}
      />
    </>
  );
};

// Default export for Remotion entry point
export default RemotionRoot;
