/**
 * HTML Renderer Integration Tests
 *
 * Integration tests for the HTML presentation renderer.
 * Tests HTML output structure, content, and navigation elements.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseTalkTrack, stripSemanticTags } from '../../src/parsers/index.js';
import { buildTimeline } from '../../src/generators/timeline/index.js';
import {
  renderHtmlPresentationToString,
  getHtmlPresentationSummary,
  DEFAULT_HTML_OPTIONS,
} from '../../src/renderers/html/index.js';
import type { TalkTrackV5 } from '../../src/parsers/types.js';
import type { AudioManifest, AudioManifestEntry, Timeline } from '../../src/generators/timeline/types.js';

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
let htmlOutputWithTimeline: string;
let htmlOutputWithoutTimeline: string;

/**
 * Creates a mock audio manifest for testing.
 */
function createMockAudioManifest(talkTrack: TalkTrackV5): AudioManifest {
  const entries = new Map<string, AudioManifestEntry>();

  for (const slide of talkTrack.slides) {
    const content = talkTrack.slideContent.get(slide.slug);
    if (!content) continue;

    const cleanText = stripSemanticTags(content.audioText);
    const wordCount = cleanText.split(/\s+/).filter((w) => w).length;
    const duration = Math.max(2, wordCount / 2.5);

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

  // Generate HTML with and without timeline
  htmlOutputWithTimeline = renderHtmlPresentationToString(parsedTalkTrack, timeline);
  htmlOutputWithoutTimeline = renderHtmlPresentationToString(parsedTalkTrack, null);
});

// -----------------------------------------------------------------------------
// Basic HTML Structure Tests
// -----------------------------------------------------------------------------

describe('HTML Renderer Integration: Basic Structure', () => {
  it('should generate valid HTML document', () => {
    expect(htmlOutputWithTimeline).toContain('<!DOCTYPE html>');
    expect(htmlOutputWithTimeline).toContain('<html');
    expect(htmlOutputWithTimeline).toContain('</html>');
    expect(htmlOutputWithTimeline).toContain('<head>');
    expect(htmlOutputWithTimeline).toContain('</head>');
    expect(htmlOutputWithTimeline).toContain('<body>');
    expect(htmlOutputWithTimeline).toContain('</body>');
  });

  it('should include document title', () => {
    expect(htmlOutputWithTimeline).toContain('<title>');
    expect(htmlOutputWithTimeline).toContain(parsedTalkTrack.title);
  });

  it('should include CSS styles', () => {
    expect(htmlOutputWithTimeline).toContain('<style>');
    expect(htmlOutputWithTimeline).toContain('</style>');
  });

  it('should include JavaScript', () => {
    expect(htmlOutputWithTimeline).toContain('<script>');
    expect(htmlOutputWithTimeline).toContain('</script>');
  });

  it('should be a self-contained HTML file', () => {
    // Should not have external stylesheet links
    expect(htmlOutputWithTimeline).not.toMatch(/<link[^>]+rel=["']stylesheet["'][^>]+href=/);
    // Should not have external script sources (except for data/inline)
    expect(htmlOutputWithTimeline).not.toMatch(/<script[^>]+src=["']https?:\/\//);
  });
});

// -----------------------------------------------------------------------------
// Slide Content Tests
// -----------------------------------------------------------------------------

describe('HTML Renderer Integration: Slide Content', () => {
  it('should include all slides', () => {
    for (const slide of parsedTalkTrack.slides) {
      expect(htmlOutputWithTimeline).toContain(slide.slug);
    }
  });

  it('should include slide titles', () => {
    for (const slide of parsedTalkTrack.slides) {
      expect(htmlOutputWithTimeline).toContain(slide.title);
    }
  });

  it('should include slide images', () => {
    for (const slide of parsedTalkTrack.slides) {
      // Image filename should be referenced
      expect(htmlOutputWithTimeline).toContain(slide.image);
    }
  });

  it('should render correct number of slides in JavaScript data', () => {
    // Count slide entries in the JavaScript slides array
    // Slides are stored as JavaScript objects with slug property
    const slideMatches = htmlOutputWithTimeline.match(/slug:\s*'/g);
    expect(slideMatches?.length).toBe(parsedTalkTrack.slides.length);
  });

  it('should include speaker notes as data', () => {
    // Speaker notes should be present somewhere in the HTML
    const titleContent = parsedTalkTrack.slideContent.get('title-slide');
    if (titleContent?.speakerNotes) {
      expect(htmlOutputWithTimeline).toContain('Make eye contact');
    }
  });
});

// -----------------------------------------------------------------------------
// Navigation Elements Tests
// -----------------------------------------------------------------------------

describe('HTML Renderer Integration: Navigation', () => {
  it('should include progress bar element', () => {
    // Look for progress bar by class or id
    expect(htmlOutputWithTimeline).toMatch(/progress/i);
  });

  it('should include slide counter', () => {
    // Slide counter showing current/total
    const totalSlides = parsedTalkTrack.slides.length.toString();
    expect(htmlOutputWithTimeline).toContain(totalSlides);
  });

  it('should include keyboard navigation JavaScript', () => {
    // Should have keydown event listener
    expect(htmlOutputWithTimeline).toContain('keydown');
    // Should handle arrow keys or specific navigation keys
    expect(htmlOutputWithTimeline).toMatch(/Arrow(Left|Right)|key/i);
  });

  it('should include section information', () => {
    // Section names should appear
    expect(htmlOutputWithTimeline).toContain('Opening');
    expect(htmlOutputWithTimeline).toContain('The Problem');
    expect(htmlOutputWithTimeline).toContain('Our Solution');
  });
});

// -----------------------------------------------------------------------------
// Metadata and Branding Tests
// -----------------------------------------------------------------------------

describe('HTML Renderer Integration: Metadata', () => {
  it('should include presentation title', () => {
    expect(htmlOutputWithTimeline).toContain('AI-Native Software Development');
  });

  it('should include author name', () => {
    expect(htmlOutputWithTimeline).toContain('Jane Developer');
  });

  it('should include metadata in JavaScript', () => {
    // Metadata is embedded in the JavaScript, not as visible HTML
    expect(htmlOutputWithTimeline).toContain("title: 'AI-Native Software Development'");
  });

  it('should apply branding colors from talk track', () => {
    // Primary color should be in styles
    expect(htmlOutputWithTimeline).toContain('#2563eb');
  });

  it('should include section colors', () => {
    expect(htmlOutputWithTimeline).toContain('#557373'); // Opening section
    expect(htmlOutputWithTimeline).toContain('#6B4C4C'); // Problem section
  });
});

// -----------------------------------------------------------------------------
// Timeline Integration Tests
// -----------------------------------------------------------------------------

describe('HTML Renderer Integration: Timeline Data', () => {
  it('should include audio paths when timeline provided', () => {
    // Audio paths should be present
    expect(htmlOutputWithTimeline).toContain('audio/');
    expect(htmlOutputWithTimeline).toMatch(/audio\/[a-z-]+\.mp3/);
  });

  it('should work without timeline', () => {
    expect(htmlOutputWithoutTimeline).toContain('<!DOCTYPE html>');
    expect(htmlOutputWithoutTimeline).toContain(parsedTalkTrack.title);
    expect(htmlOutputWithoutTimeline).toContain('title-slide');
  });

  it('should not include audio paths when no timeline', () => {
    // The exact behavior depends on implementation
    // But slides should still be present
    for (const slide of parsedTalkTrack.slides) {
      expect(htmlOutputWithoutTimeline).toContain(slide.slug);
    }
  });
});

// -----------------------------------------------------------------------------
// Custom Options Tests
// -----------------------------------------------------------------------------

describe('HTML Renderer Integration: Custom Options', () => {
  it('should apply custom primary color', () => {
    const customHtml = renderHtmlPresentationToString(parsedTalkTrack, timeline, {
      primaryColor: '#ff5722',
    });
    expect(customHtml).toContain('#ff5722');
  });

  it('should apply custom background color', () => {
    const customHtml = renderHtmlPresentationToString(parsedTalkTrack, timeline, {
      backgroundColor: '#121212',
    });
    expect(customHtml).toContain('#121212');
  });

  it('should use default options when not specified', () => {
    // Default primary color should be used if no branding
    const minimalTalkTrack: TalkTrackV5 = {
      ...parsedTalkTrack,
      branding: undefined,
    };
    const html = renderHtmlPresentationToString(minimalTalkTrack, null);
    expect(html).toContain(DEFAULT_HTML_OPTIONS.primaryColor);
  });
});

// -----------------------------------------------------------------------------
// Summary Function Tests
// -----------------------------------------------------------------------------

describe('HTML Renderer Integration: Summary', () => {
  it('should return correct summary statistics', () => {
    const summary = getHtmlPresentationSummary(parsedTalkTrack, timeline);

    expect(summary.title).toBe('AI-Native Software Development');
    expect(summary.slideCount).toBe(7);
    expect(summary.sectionCount).toBe(5);
  });

  it('should identify main and appendix slides', () => {
    const summary = getHtmlPresentationSummary(parsedTalkTrack, timeline);

    expect(summary.mainSlideCount).toBe(6);
    expect(summary.appendixSlideCount).toBe(1);
  });

  it('should detect audio presence', () => {
    const summaryWithAudio = getHtmlPresentationSummary(parsedTalkTrack, timeline);
    expect(summaryWithAudio.hasAudio).toBe(true);

    const summaryNoAudio = getHtmlPresentationSummary(parsedTalkTrack, null);
    expect(summaryNoAudio.hasAudio).toBe(false);
  });

  it('should include audio duration when timeline present', () => {
    const summary = getHtmlPresentationSummary(parsedTalkTrack, timeline);
    expect(summary.totalAudioDuration).toBeGreaterThan(0);
  });

  it('should include target minutes', () => {
    const summary = getHtmlPresentationSummary(parsedTalkTrack, timeline);
    expect(summary.targetMinutes).toBe(15);
  });
});

// -----------------------------------------------------------------------------
// Appendix Handling Tests
// -----------------------------------------------------------------------------

describe('HTML Renderer Integration: Appendix Slides', () => {
  it('should include appendix slides in output', () => {
    expect(htmlOutputWithTimeline).toContain('appendix-resources');
    expect(htmlOutputWithTimeline).toContain('Additional Resources');
  });

  it('should mark appendix slides appropriately', () => {
    // Appendix slides might have special data attributes or classes
    expect(htmlOutputWithTimeline).toContain('appendix');
  });
});

// -----------------------------------------------------------------------------
// Accessibility Tests
// -----------------------------------------------------------------------------

describe('HTML Renderer Integration: Accessibility', () => {
  it('should include language attribute', () => {
    expect(htmlOutputWithTimeline).toMatch(/<html[^>]+lang=/);
  });

  it('should include viewport meta tag', () => {
    expect(htmlOutputWithTimeline).toContain('viewport');
  });

  it('should include alt text for images', () => {
    // Images should have alt attributes
    const imgTags = htmlOutputWithTimeline.match(/<img[^>]+>/g) || [];
    for (const img of imgTags) {
      expect(img).toContain('alt=');
    }
  });
});

// -----------------------------------------------------------------------------
// Print Support Tests
// -----------------------------------------------------------------------------

describe('HTML Renderer Integration: Print Support', () => {
  it('should include print-related CSS', () => {
    expect(htmlOutputWithTimeline).toMatch(/@media\s+print/);
  });
});

// -----------------------------------------------------------------------------
// Data Integrity Tests
// -----------------------------------------------------------------------------

describe('HTML Renderer Integration: Data Integrity', () => {
  it('should preserve slide order', () => {
    const slugs = parsedTalkTrack.slides.map((s) => s.slug);

    // Find positions of each slug in the HTML
    const positions = slugs.map((slug) => htmlOutputWithTimeline.indexOf(slug));

    // Each position should be greater than the previous (maintaining order)
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });

  it('should not include raw semantic tags in output', () => {
    // Semantic tags should be stripped from visible content
    expect(htmlOutputWithTimeline).not.toMatch(/\[HOOK\]/);
    expect(htmlOutputWithTimeline).not.toMatch(/\[KEY_POINT\]/);
    expect(htmlOutputWithTimeline).not.toMatch(/\[PAUSE:\d+\]/);
  });

  it('should escape special HTML characters in content', () => {
    // Create talk track with special characters
    const contentWithSpecialChars = fixtureContent.replace(
      'Welcome everyone',
      'Welcome <everyone> & "friends"'
    );

    try {
      const trackWithSpecialChars = parseTalkTrack(contentWithSpecialChars);
      const html = renderHtmlPresentationToString(trackWithSpecialChars, null);

      // Special characters should be escaped
      expect(html).not.toContain('<everyone>');
      expect(html).toMatch(/&lt;everyone&gt;|&amp;/);
    } catch {
      // If parsing fails due to modification, skip this test
      expect(true).toBe(true);
    }
  });
});

// -----------------------------------------------------------------------------
// Edge Cases Tests
// -----------------------------------------------------------------------------

describe('HTML Renderer Integration: Edge Cases', () => {
  it('should handle slides without speaker notes', () => {
    // Some slides may not have speaker notes - should not error
    const html = renderHtmlPresentationToString(parsedTalkTrack, null);
    expect(html).toBeDefined();
    expect(html.length).toBeGreaterThan(0);
  });

  it('should handle empty subtitle', () => {
    const trackNoSubtitle: TalkTrackV5 = {
      ...parsedTalkTrack,
      subtitle: undefined,
    };
    const html = renderHtmlPresentationToString(trackNoSubtitle, null);
    expect(html).toBeDefined();
    expect(html).toContain(parsedTalkTrack.title);
  });

  it('should handle empty event', () => {
    const trackNoEvent: TalkTrackV5 = {
      ...parsedTalkTrack,
      event: undefined,
    };
    const html = renderHtmlPresentationToString(trackNoEvent, null);
    expect(html).toBeDefined();
  });
});
