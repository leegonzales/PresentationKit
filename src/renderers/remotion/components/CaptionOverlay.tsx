/**
 * CaptionOverlay Component
 *
 * Displays captions/subtitles for the presentation with support for:
 * - Current caption highlighting
 * - Word-level highlighting (karaoke style) when wordTimings available
 * - Semi-transparent background for readability
 */

import React, { type FC, useMemo } from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import type { CaptionOverlayProps, CaptionConfig, Caption, WordTiming } from '../types.js';
import { DEFAULT_CAPTION_CONFIG } from '../types.js';

/**
 * WordHighlightedText Component
 *
 * Renders text with karaoke-style word highlighting based on timing data.
 * Words that have been spoken are highlighted, current word has glow effect.
 */
interface WordHighlightedTextProps {
  /** The caption text to display */
  text: string;
  /** Word-level timing data */
  wordTimings: WordTiming[];
  /** Current time in seconds relative to caption start */
  elapsedTime: number;
  /** Highlight color for spoken words */
  highlightColor?: string;
  /** Color for words not yet spoken */
  dimmedColor?: string;
}

const WordHighlightedText: FC<WordHighlightedTextProps> = ({
  text,
  wordTimings,
  elapsedTime,
  highlightColor = '#ffffff',
  dimmedColor = 'rgba(255, 255, 255, 0.5)',
}) => {
  // If no word timings, show full text highlighted
  if (!wordTimings || wordTimings.length === 0) {
    return <span style={{ color: highlightColor }}>{text}</span>;
  }

  // Determine which words have been spoken
  const wordStates = useMemo(() => {
    return wordTimings.map((timing, index) => {
      const isSpoken = elapsedTime >= timing.start;
      const isCurrent =
        elapsedTime >= timing.start &&
        (elapsedTime < timing.end || index === wordTimings.length - 1);
      return { ...timing, isSpoken, isCurrent };
    });
  }, [wordTimings, elapsedTime]);

  return (
    <span>
      {wordStates.map((word, index) => {
        const color = word.isSpoken ? highlightColor : dimmedColor;
        const glow = word.isCurrent ? `0 0 12px ${highlightColor}60` : 'none';

        return (
          <span
            key={`${word.word}-${index}`}
            style={{
              color,
              textShadow: glow,
              transition: 'color 0.1s ease-out',
            }}
          >
            {word.word}
            {index < wordStates.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </span>
  );
};

/**
 * CaptionOverlay Component
 *
 * Displays captions at the bottom center of the screen with:
 * - Semi-transparent background
 * - Fade in/out transitions
 * - Optional word-level highlighting
 */
export const CaptionOverlay: FC<CaptionOverlayProps> = ({
  captions,
  currentTime,
  showWordHighlight = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const config = DEFAULT_CAPTION_CONFIG;

  // Find the active caption based on current time
  const activeCaption = useMemo(() => {
    return captions.find(
      (caption: Caption) => currentTime >= caption.startTime && currentTime < caption.endTime
    );
  }, [captions, currentTime]);

  // If no active caption, try to show the most recent one (for persistence)
  const displayCaption = useMemo(() => {
    if (activeCaption) return activeCaption;

    // Find most recent caption that has started
    const pastCaptions = captions.filter((c: Caption) => currentTime >= c.startTime);
    if (pastCaptions.length === 0) return null;

    const mostRecent = pastCaptions.sort((a: Caption, b: Caption) => b.startTime - a.startTime)[0];

    // Only show if within a small buffer after it ended (0.5s)
    const PERSISTENCE_BUFFER = 0.5;
    if (currentTime < mostRecent.endTime + PERSISTENCE_BUFFER) {
      return mostRecent;
    }

    return null;
  }, [activeCaption, captions, currentTime]);

  if (!displayCaption) {
    return null;
  }

  // Calculate fade in/out opacity
  const FADE_DURATION = 0.2; // seconds
  const timeSinceStart = currentTime - displayCaption.startTime;
  const timeUntilEnd = displayCaption.endTime - currentTime;

  // Spring-based fade animation
  const fadeInFrames = Math.floor(timeSinceStart * fps);
  const fadeIn = spring({
    frame: Math.max(0, fadeInFrames),
    fps,
    config: { damping: 200, mass: 0.5 },
  });

  const fadeOutFrames = Math.floor(timeUntilEnd * fps);
  const fadeOut =
    timeUntilEnd < FADE_DURATION
      ? spring({
          frame: Math.max(0, fadeOutFrames),
          fps,
          config: { damping: 200, mass: 0.5 },
        })
      : 1;

  const opacity = Math.min(fadeIn, fadeOut);

  // Calculate elapsed time for word highlighting
  const elapsedTime = currentTime - displayCaption.startTime;

  // Slide up animation
  const translateY = interpolate(fadeIn, [0, 1], [20, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: config.bottomOffset,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 60px',
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          backgroundColor: config.backgroundColor,
          padding: `${config.padding}px ${config.padding * 1.5}px`,
          borderRadius: config.borderRadius,
          maxWidth: '80%',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: config.fontFamily,
            fontSize: config.fontSize,
            fontWeight: 600,
            color: config.color,
            lineHeight: 1.4,
            textShadow: '2px 2px 8px rgba(0, 0, 0, 0.9)',
          }}
        >
          {showWordHighlight && displayCaption.words ? (
            <WordHighlightedText
              text={displayCaption.text}
              wordTimings={displayCaption.words}
              elapsedTime={elapsedTime}
            />
          ) : (
            displayCaption.text
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * CompactCaptionOverlay Component
 *
 * A more compact version of the caption overlay suitable for
 * dense content or when more screen real estate is needed.
 */
export const CompactCaptionOverlay: FC<CaptionOverlayProps> = ({
  captions,
  currentTime,
  showWordHighlight = false,
}) => {
  const compactConfig: CaptionConfig = {
    ...DEFAULT_CAPTION_CONFIG,
    fontSize: 32,
    padding: 12,
    bottomOffset: 40,
  };

  return (
    <CaptionOverlay
      captions={captions}
      currentTime={currentTime}
      showWordHighlight={showWordHighlight}
    />
  );
};

export default CaptionOverlay;
