/**
 * Transition Component
 *
 * Provides configurable transition effects between slides.
 * Supports fade, crossfade, and no-transition modes.
 */

import React, { type FC, type ReactNode } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import type { TransitionProps } from '../types.js';
import { DEFAULT_TRANSITION_DURATION } from '../types.js';

/**
 * Fade transition wrapper.
 * Fades the child content in or out based on progress.
 */
interface FadeTransitionProps {
  /** Content to apply the fade to */
  children: ReactNode;
  /** Transition progress (0-1) */
  progress: number;
  /** Direction of fade ('in' or 'out') */
  direction: 'in' | 'out';
}

const FadeTransition: FC<FadeTransitionProps> = ({ children, progress, direction }) => {
  const opacity = direction === 'in' ? progress : 1 - progress;

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};

/**
 * Crossfade transition component.
 * Smoothly crossfades between outgoing and incoming content.
 */
interface CrossfadeTransitionProps {
  /** Content that is fading out */
  outgoing: ReactNode;
  /** Content that is fading in */
  incoming: ReactNode;
  /** Transition progress (0-1, where 0=fully outgoing, 1=fully incoming) */
  progress: number;
}

const CrossfadeTransition: FC<CrossfadeTransitionProps> = ({
  outgoing,
  incoming,
  progress,
}) => {
  return (
    <>
      <AbsoluteFill style={{ opacity: 1 - progress }}>
        {outgoing}
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: progress }}>
        {incoming}
      </AbsoluteFill>
    </>
  );
};

/**
 * Generic Transition component.
 * Wraps content with the specified transition effect.
 */
interface TransitionWrapperProps {
  /** Transition configuration */
  transition: TransitionProps;
  /** Content to render with transition */
  children: ReactNode;
  /** Whether this is the entry (fade in) or exit (fade out) */
  isEntry?: boolean;
}

export const TransitionWrapper: FC<TransitionWrapperProps> = ({
  transition,
  children,
  isEntry = true,
}) => {
  const { type, progress } = transition;

  if (type === 'none') {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  if (type === 'fade') {
    return (
      <FadeTransition progress={progress} direction={isEntry ? 'in' : 'out'}>
        {children}
      </FadeTransition>
    );
  }

  // For crossfade, the component should be used with CrossfadeTransition directly
  // This wrapper handles single-element fades
  return (
    <FadeTransition progress={progress} direction={isEntry ? 'in' : 'out'}>
      {children}
    </FadeTransition>
  );
};

/**
 * Hook to calculate transition progress based on frame timing.
 * Returns a TransitionProps object ready for use with transition components.
 */
interface UseTransitionOptions {
  /** Total duration of the content in frames */
  durationInFrames: number;
  /** Transition type */
  type?: 'fade' | 'crossfade' | 'none';
  /** Transition duration in seconds */
  transitionDuration?: number;
}

interface TransitionState {
  /** Whether currently in entry transition */
  isEntering: boolean;
  /** Whether currently in exit transition */
  isExiting: boolean;
  /** Entry transition progress (0-1) */
  entryProgress: number;
  /** Exit transition progress (0-1) */
  exitProgress: number;
  /** Combined opacity for simple fade effects */
  opacity: number;
}

export const useTransition = ({
  durationInFrames,
  type = 'fade',
  transitionDuration = DEFAULT_TRANSITION_DURATION,
}: UseTransitionOptions): TransitionState => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const transitionFrames = Math.floor(transitionDuration * fps);

  // Entry transition (fade in at start)
  const isEntering = frame < transitionFrames;
  const entryProgress = isEntering
    ? spring({
        frame,
        fps,
        config: { damping: 200, mass: 0.5 },
      })
    : 1;

  // Exit transition (fade out at end)
  const framesUntilEnd = durationInFrames - frame;
  const isExiting = framesUntilEnd < transitionFrames;
  const exitProgress = isExiting
    ? spring({
        frame: Math.max(0, framesUntilEnd),
        fps,
        config: { damping: 200, mass: 0.5 },
      })
    : 1;

  // Combined opacity for simple cases
  const opacity = type === 'none' ? 1 : Math.min(entryProgress, exitProgress);

  return {
    isEntering,
    isExiting,
    entryProgress,
    exitProgress,
    opacity,
  };
};

/**
 * SlideTransition Component
 *
 * High-level component for managing slide transitions.
 * Automatically handles entry/exit animations based on frame position.
 */
interface SlideTransitionProps {
  /** Slide content to render */
  children: ReactNode;
  /** Total slide duration in frames */
  durationInFrames: number;
  /** Transition type */
  type?: 'fade' | 'crossfade' | 'none';
  /** Transition duration in seconds */
  transitionDuration?: number;
}

export const SlideTransition: FC<SlideTransitionProps> = ({
  children,
  durationInFrames,
  type = 'fade',
  transitionDuration = DEFAULT_TRANSITION_DURATION,
}) => {
  const { opacity } = useTransition({
    durationInFrames,
    type,
    transitionDuration,
  });

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};

// Export individual transition components for advanced use
export { FadeTransition, CrossfadeTransition };

export default SlideTransition;
