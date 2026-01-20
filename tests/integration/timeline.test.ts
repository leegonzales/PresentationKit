/**
 * Timeline Integration Tests
 *
 * Integration tests for the timeline builder, including caption sync
 * and slide timing calculations.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseTalkTrack, stripSemanticTags } from '../../src/parsers/index.js';
import {
  buildTimeline,
  calculateTotalFrames,
  getSlideAtTime,
  getSlideAtFrame,
  getCaptionAtTime,
  formatDuration,
  summarizeTimeline,
  splitIntoSentences,
  estimateCaptionTimings,
  scaleCaptionsToAudioDuration,
  TimelineBuildError,
} from '../../src/generators/timeline/index.js';
import type { TalkTrackV5 } from '../../src/parsers/types.js';
import type {
  AudioManifest,
  AudioManifestEntry,
  Timeline,
  TimelineSlide,
} from '../../src/generators/timeline/types.js';

// Get the directory of this test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the sample talk track fixture
const FIXTURE_PATH = join(__dirname, '../fixtures/sample-talk-track.md');

// Test data
let fixtureContent: string;
let parsedTalkTrack: TalkTrackV5;
let mockAudioManifest: AudioManifest;
let timeline: Timeline;

/**
 * Creates a mock audio manifest for testing.
 * Simulates audio generation without actual TTS calls.
 */
function createMockAudioManifest(talkTrack: TalkTrackV5): AudioManifest {
  const entries = new Map<string, AudioManifestEntry>();

  for (const slide of talkTrack.slides) {
    const content = talkTrack.slideContent.get(slide.slug);
    if (!content) continue;

    // Estimate duration based on word count (150 WPM = 2.5 words/second)
    const cleanText = stripSemanticTags(content.audioText);
    const wordCount = cleanText.split(/\s+/).filter((w) => w).length;
    const duration = Math.max(2, wordCount / 2.5); // Minimum 2 seconds

    entries.set(slide.slug, {
      slug: slide.slug,
      path: `audio/${slide.slug}.mp3`,
      duration,
      provider: 'kokoro',
    });
  }

  return {
    voice: 'af_heart',
    provider: 'kokoro',
    entries,
  };
}

beforeAll(() => {
  fixtureContent = readFileSync(FIXTURE_PATH, 'utf-8');
  parsedTalkTrack = parseTalkTrack(fixtureContent);
  mockAudioManifest = createMockAudioManifest(parsedTalkTrack);
  timeline = buildTimeline(parsedTalkTrack, mockAudioManifest);
});

// -----------------------------------------------------------------------------
// Timeline Building Tests
// -----------------------------------------------------------------------------

describe('Timeline Integration: Basic Building', () => {
  it('should build timeline from talk track and audio manifest', () => {
    expect(timeline).toBeDefined();
    expect(timeline.slides).toHaveLength(parsedTalkTrack.slides.length);
  });

  it('should set default timeline options', () => {
    expect(timeline.fps).toBe(30);
    expect(timeline.width).toBe(1920);
    expect(timeline.height).toBe(1080);
  });

  it('should respect custom timeline options', () => {
    const customTimeline = buildTimeline(parsedTalkTrack, mockAudioManifest, {
      fps: 60,
      width: 3840,
      height: 2160,
      transitionPadding: 0.5,
    });

    expect(customTimeline.fps).toBe(60);
    expect(customTimeline.width).toBe(3840);
    expect(customTimeline.height).toBe(2160);
  });

  it('should calculate total duration', () => {
    expect(timeline.totalDuration).toBeGreaterThan(0);
    // Total should be sum of all slide durations
    const sumDurations = timeline.slides.reduce((sum, slide) => sum + slide.duration, 0);
    expect(timeline.totalDuration).toBeCloseTo(sumDurations, 2);
  });
});

// -----------------------------------------------------------------------------
// Slide Timing Tests
// -----------------------------------------------------------------------------

describe('Timeline Integration: Slide Timing', () => {
  it('should calculate sequential start times', () => {
    let expectedStartTime = 0;
    for (const slide of timeline.slides) {
      expect(slide.startTime).toBeCloseTo(expectedStartTime, 2);
      expectedStartTime = slide.endTime;
    }
  });

  it('should set end time = start time + duration', () => {
    for (const slide of timeline.slides) {
      expect(slide.endTime).toBeCloseTo(slide.startTime + slide.duration, 2);
    }
  });

  it('should include transition padding in duration', () => {
    // Default transition padding is 0.3 seconds
    for (const slide of timeline.slides) {
      expect(slide.duration).toBeGreaterThan(slide.audioDuration);
      expect(slide.duration).toBeCloseTo(slide.audioDuration + 0.3, 2);
    }
  });

  it('should preserve slide metadata', () => {
    const firstSlide = timeline.slides[0];
    expect(firstSlide.slug).toBe('title-slide');
    expect(firstSlide.title).toBe('Welcome to AI-Native Dev');
    expect(firstSlide.section).toBe('opening');
  });

  it('should include section color from sections definition', () => {
    const firstSlide = timeline.slides[0];
    expect(firstSlide.sectionColor).toBe('#557373'); // Opening section color
  });

  it('should include audio path and duration', () => {
    for (const slide of timeline.slides) {
      expect(slide.audioPath).toMatch(/^audio\/.+\.mp3$/);
      expect(slide.audioDuration).toBeGreaterThan(0);
    }
  });
});

// -----------------------------------------------------------------------------
// Caption Sync Tests
// -----------------------------------------------------------------------------

describe('Timeline Integration: Caption Sync', () => {
  it('should generate captions for each slide', () => {
    for (const slide of timeline.slides) {
      expect(slide.captions).toBeDefined();
      expect(Array.isArray(slide.captions)).toBe(true);
    }
  });

  it('should have captions with proper timing', () => {
    const slideWithCaptions = timeline.slides.find((s) => s.captions.length > 0);
    expect(slideWithCaptions).toBeDefined();

    if (slideWithCaptions) {
      for (const caption of slideWithCaptions.captions) {
        expect(caption.startTime).toBeDefined();
        expect(caption.endTime).toBeDefined();
        expect(caption.endTime).toBeGreaterThan(caption.startTime);
        expect(caption.text).toBeTruthy();
      }
    }
  });

  it('should have sequential caption timings', () => {
    for (const slide of timeline.slides) {
      let lastEndTime = 0;
      for (const caption of slide.captions) {
        expect(caption.startTime).toBeGreaterThanOrEqual(lastEndTime - 0.01); // Allow tiny overlap
        lastEndTime = caption.endTime;
      }
    }
  });

  it('should scale captions to match audio duration', () => {
    for (const slide of timeline.slides) {
      if (slide.captions.length > 0) {
        const lastCaption = slide.captions[slide.captions.length - 1];
        // Caption end time should be close to audio duration
        expect(lastCaption.endTime).toBeLessThanOrEqual(slide.audioDuration + 0.5);
      }
    }
  });
});

// -----------------------------------------------------------------------------
// Caption Utility Tests
// -----------------------------------------------------------------------------

describe('Timeline Integration: Caption Utilities', () => {
  it('splitIntoSentences should split on sentence boundaries', () => {
    const text = 'Hello world. How are you? I am fine!';
    const sentences = splitIntoSentences(text);

    expect(sentences).toHaveLength(3);
    expect(sentences[0]).toBe('Hello world.');
    expect(sentences[1]).toBe('How are you?');
    expect(sentences[2]).toBe('I am fine!');
  });

  it('splitIntoSentences should handle empty text', () => {
    expect(splitIntoSentences('')).toEqual([]);
    expect(splitIntoSentences('   ')).toEqual([]);
  });

  it('splitIntoSentences should normalize whitespace', () => {
    const text = 'Hello   world.    How are   you?';
    const sentences = splitIntoSentences(text);

    expect(sentences[0]).toBe('Hello world.');
    expect(sentences[1]).toBe('How are you?');
  });

  it('estimateCaptionTimings should create timed captions', () => {
    const text = 'First sentence. Second sentence.';
    const captions = estimateCaptionTimings(text, 0);

    expect(captions).toHaveLength(2);
    expect(captions[0].text).toBe('First sentence.');
    expect(captions[0].startTime).toBe(0);
    expect(captions[1].startTime).toBeGreaterThan(captions[0].endTime - 0.01);
  });

  it('estimateCaptionTimings should respect start offset', () => {
    const text = 'A sentence.';
    const captions = estimateCaptionTimings(text, 5.0);

    expect(captions[0].startTime).toBeGreaterThanOrEqual(5.0);
  });

  it('scaleCaptionsToAudioDuration should scale to target duration', () => {
    const captions = estimateCaptionTimings('First. Second. Third.', 0);
    const originalDuration = captions[captions.length - 1].endTime;

    const targetDuration = 10;
    const scaled = scaleCaptionsToAudioDuration(captions, targetDuration);

    const scaledDuration = scaled[scaled.length - 1].endTime;
    expect(scaledDuration).toBeCloseTo(targetDuration, 1);
  });
});

// -----------------------------------------------------------------------------
// Timeline Query Functions Tests
// -----------------------------------------------------------------------------

describe('Timeline Integration: Query Functions', () => {
  it('calculateTotalFrames should return correct frame count', () => {
    const frames = calculateTotalFrames(timeline);
    const expectedFrames = Math.ceil(timeline.totalDuration * timeline.fps);
    expect(frames).toBe(expectedFrames);
  });

  it('getSlideAtTime should return correct slide', () => {
    const firstSlide = timeline.slides[0];
    const slide = getSlideAtTime(timeline, firstSlide.startTime + 0.5);

    expect(slide).toBeDefined();
    expect(slide?.slug).toBe(firstSlide.slug);
  });

  it('getSlideAtTime should return undefined for time past end', () => {
    const slide = getSlideAtTime(timeline, timeline.totalDuration + 10);
    expect(slide).toBeUndefined();
  });

  it('getSlideAtFrame should return correct slide', () => {
    const firstSlide = timeline.slides[0];
    const frameInFirstSlide = Math.floor((firstSlide.startTime + 0.5) * timeline.fps);
    const slide = getSlideAtFrame(timeline, frameInFirstSlide);

    expect(slide).toBeDefined();
    expect(slide?.slug).toBe(firstSlide.slug);
  });

  it('getCaptionAtTime should return active caption', () => {
    const slideWithCaptions = timeline.slides.find((s) => s.captions.length > 0);
    if (!slideWithCaptions) return;

    const firstCaption = slideWithCaptions.captions[0];
    const absoluteTime = slideWithCaptions.startTime + firstCaption.startTime + 0.1;
    const caption = getCaptionAtTime(slideWithCaptions, absoluteTime);

    expect(caption).toBeDefined();
    expect(caption?.text).toBe(firstCaption.text);
  });

  it('getCaptionAtTime should return undefined when no caption active', () => {
    const slideWithCaptions = timeline.slides.find((s) => s.captions.length > 0);
    if (!slideWithCaptions) return;

    // Query time after all captions
    const lastCaption = slideWithCaptions.captions[slideWithCaptions.captions.length - 1];
    const timeAfterCaptions = slideWithCaptions.startTime + lastCaption.endTime + 10;
    const caption = getCaptionAtTime(slideWithCaptions, timeAfterCaptions);

    expect(caption).toBeUndefined();
  });
});

// -----------------------------------------------------------------------------
// Formatting Functions Tests
// -----------------------------------------------------------------------------

describe('Timeline Integration: Formatting', () => {
  it('formatDuration should format seconds as MM:SS', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(30)).toBe('0:30');
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(125)).toBe('2:05');
  });

  it('formatDuration should format hours as HH:MM:SS', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(7200)).toBe('2:00:00');
  });

  it('summarizeTimeline should return readable summary', () => {
    const summary = summarizeTimeline(timeline);

    expect(summary).toContain('Timeline Summary');
    expect(summary).toContain(`${timeline.width}x${timeline.height}`);
    expect(summary).toContain(`${timeline.fps}fps`);
    expect(summary).toContain(`Total Slides: ${timeline.slides.length}`);
    expect(summary).toContain('title-slide');
  });
});

// -----------------------------------------------------------------------------
// Error Handling Tests
// -----------------------------------------------------------------------------

describe('Timeline Integration: Error Handling', () => {
  it('should throw TimelineBuildError for missing slide content', () => {
    const invalidManifest: AudioManifest = {
      voice: 'af_heart',
      provider: 'kokoro',
      entries: new Map([
        ['nonexistent-slide', {
          slug: 'nonexistent-slide',
          path: 'audio/test.mp3',
          duration: 5,
          provider: 'kokoro',
        }],
      ]),
    };

    // Create a talk track with mismatched content
    const modifiedTalkTrack = { ...parsedTalkTrack };
    modifiedTalkTrack.slides = [
      {
        position: '1',
        slug: 'missing-content',
        title: 'Missing',
        image: 'missing.png',
        section: 'opening',
      },
    ];

    expect(() => buildTimeline(modifiedTalkTrack, invalidManifest)).toThrow(TimelineBuildError);
  });

  it('should throw TimelineBuildError for missing audio entry', () => {
    const emptyManifest: AudioManifest = {
      voice: 'af_heart',
      provider: 'kokoro',
      entries: new Map(),
    };

    expect(() => buildTimeline(parsedTalkTrack, emptyManifest)).toThrow(TimelineBuildError);
  });
});

// -----------------------------------------------------------------------------
// Complex Scenario Tests
// -----------------------------------------------------------------------------

describe('Timeline Integration: Complex Scenarios', () => {
  it('should handle talk track with varying slide durations', () => {
    // Slides should have different durations based on audio length
    const durations = timeline.slides.map((s) => s.audioDuration);
    const uniqueDurations = new Set(durations.map((d) => Math.round(d * 10) / 10));

    // With different word counts, we expect different durations
    expect(uniqueDurations.size).toBeGreaterThan(1);
  });

  it('should correctly sequence all slides', () => {
    let previousEndTime = 0;
    for (let i = 0; i < timeline.slides.length; i++) {
      const slide = timeline.slides[i];
      expect(slide.startTime).toBeCloseTo(previousEndTime, 2);
      previousEndTime = slide.endTime;
    }
    expect(timeline.totalDuration).toBeCloseTo(previousEndTime, 2);
  });

  it('should maintain section color consistency', () => {
    const problemSlides = timeline.slides.filter((s) => s.section === 'problem');
    const colors = new Set(problemSlides.map((s) => s.sectionColor));

    // All problem slides should have the same section color
    expect(colors.size).toBe(1);
    expect(problemSlides[0].sectionColor).toBe('#6B4C4C');
  });
});
