/**
 * Slide Component
 *
 * Renders a single slide with full-screen image display,
 * section color indicator bar, and fade-in transition.
 */

import React, { type FC } from 'react';
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from 'remotion';
import type { SlideProps, SectionIndicatorProps } from '../types.js';

/**
 * Section indicator bar displayed at the bottom of the slide.
 * Provides visual context for which section the slide belongs to.
 */
const SectionIndicator: FC<SectionIndicatorProps> = ({
  color,
  sectionName,
  height = 6,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height,
        backgroundColor: color,
        boxShadow: `0 -2px 12px ${color}60`,
      }}
      aria-label={sectionName ? `Section: ${sectionName}` : undefined}
    />
  );
};

/**
 * Slide Component
 *
 * Displays a single presentation slide with:
 * - Full-screen image (object-fit: cover for landscape, contain for portrait)
 * - Fade-in animation on entry
 * - Section color indicator bar at the bottom
 */
export const Slide: FC<SlideProps> = ({ slide, assetsPath, isActive = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade-in animation using spring physics
  const fadeIn = spring({
    frame,
    fps,
    config: {
      damping: 200,
      mass: 0.5,
    },
  });

  // Subtle scale animation for visual interest
  const scale = interpolate(fadeIn, [0, 1], [1.02, 1]);

  // Determine object-fit based on image aspect ratio
  // For presentation slides, 'cover' typically works best as they're designed for 16:9
  const objectFit: 'cover' | 'contain' = 'cover';

  // Build the image path - use staticFile for Remotion bundling
  const imagePath = staticFile(slide.imagePath);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000',
        opacity: isActive ? fadeIn : 0,
      }}
    >
      {/* Background image */}
      <Img
        src={imagePath}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit,
          objectPosition: 'center',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      />

      {/* Dark overlay for caption readability */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'linear-gradient(transparent 60%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0.7) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Section color indicator */}
      <SectionIndicator color={slide.sectionColor} />
    </AbsoluteFill>
  );
};

/**
 * SlideWithTitle Component
 *
 * Extended slide component that also displays the slide title.
 * Useful for title slides or when title overlay is desired.
 */
export const SlideWithTitle: FC<SlideProps & { showTitle?: boolean }> = ({
  slide,
  assetsPath,
  isActive = true,
  showTitle = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title animation - delayed fade in
  const titleFadeIn = spring({
    frame: Math.max(0, frame - 15), // 0.5s delay at 30fps
    fps,
    config: {
      damping: 100,
      mass: 0.5,
    },
  });

  return (
    <>
      <Slide slide={slide} assetsPath={assetsPath} isActive={isActive} />

      {/* Optional title overlay */}
      {showTitle && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'Inter, system-ui, sans-serif',
            opacity: titleFadeIn,
            transform: `translateY(${interpolate(titleFadeIn, [0, 1], [-20, 0])}px)`,
          }}
        >
          <div
            style={{
              display: 'inline-block',
              fontSize: 48,
              fontWeight: 'bold',
              color: '#ffffff',
              textShadow: '2px 2px 8px rgba(0,0,0,0.9)',
              backgroundColor: 'rgba(0,0,0,0.5)',
              padding: '16px 32px',
              borderRadius: 8,
              letterSpacing: '0.02em',
            }}
          >
            {slide.title}
          </div>
        </div>
      )}
    </>
  );
};

export default Slide;
