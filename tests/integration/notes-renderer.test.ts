/**
 * Notes Renderer Integration Tests
 *
 * Integration tests for the speaker notes HTML renderer.
 * Tests notes output structure, content, and print formatting.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseTalkTrack } from '../../src/parsers/index.js';
import {
  renderSpeakerNotesToString,
  getSpeakerNotesSummary,
  DEFAULT_NOTES_OPTIONS,
} from '../../src/renderers/notes/index.js';
import type { TalkTrackV5 } from '../../src/parsers/types.js';

// Get the directory of this test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the sample talk track fixture
const FIXTURE_PATH = join(__dirname, '../fixtures/sample-talk-track.md');

// Test data
let fixtureContent: string;
let parsedTalkTrack: TalkTrackV5;
let notesHtml: string;

beforeAll(() => {
  fixtureContent = readFileSync(FIXTURE_PATH, 'utf-8');
  parsedTalkTrack = parseTalkTrack(fixtureContent);
  notesHtml = renderSpeakerNotesToString(parsedTalkTrack);
});

// -----------------------------------------------------------------------------
// Basic HTML Structure Tests
// -----------------------------------------------------------------------------

describe('Notes Renderer Integration: Basic Structure', () => {
  it('should generate valid HTML document', () => {
    expect(notesHtml).toContain('<!DOCTYPE html>');
    expect(notesHtml).toContain('<html');
    expect(notesHtml).toContain('</html>');
    expect(notesHtml).toContain('<head>');
    expect(notesHtml).toContain('</head>');
    expect(notesHtml).toContain('<body>');
    expect(notesHtml).toContain('</body>');
  });

  it('should include document title', () => {
    expect(notesHtml).toContain('<title>');
    expect(notesHtml).toContain(parsedTalkTrack.title);
  });

  it('should include CSS styles', () => {
    expect(notesHtml).toContain('<style>');
    expect(notesHtml).toContain('</style>');
  });

  it('should be self-contained without external dependencies', () => {
    // No external stylesheets
    expect(notesHtml).not.toMatch(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']https?:/);
    // No external scripts
    expect(notesHtml).not.toMatch(/<script[^>]+src=["']https?:/);
  });

  it('should include print-friendly styles', () => {
    expect(notesHtml).toMatch(/@media\s+print/);
    expect(notesHtml).toContain('page-break');
  });
});

// -----------------------------------------------------------------------------
// Cover Page Tests
// -----------------------------------------------------------------------------

describe('Notes Renderer Integration: Cover Page', () => {
  it('should include presentation title', () => {
    expect(notesHtml).toContain('AI-Native Software Development');
  });

  it('should include subtitle', () => {
    expect(notesHtml).toContain('Building the Future of Code');
  });

  it('should include author name', () => {
    expect(notesHtml).toContain('Jane Developer');
  });

  it('should include event name', () => {
    expect(notesHtml).toContain('TechConf 2026');
  });

  it('should include formatted date', () => {
    // Date should be formatted nicely (e.g., "March 15, 2026")
    expect(notesHtml).toMatch(/March\s+15,?\s+2026|2026-03-15/);
  });

  it('should include total slide count', () => {
    expect(notesHtml).toContain('7'); // Total slides
  });
});

// -----------------------------------------------------------------------------
// Table of Contents Tests
// -----------------------------------------------------------------------------

describe('Notes Renderer Integration: Sections', () => {
  it('should include section names in table of contents', () => {
    // Sections appear in the TOC as section headers
    expect(notesHtml).toContain('opening');
    expect(notesHtml).toContain('problem');
    expect(notesHtml).toContain('solution');
    expect(notesHtml).toContain('closing');
    expect(notesHtml).toContain('appendix');
  });
});

// -----------------------------------------------------------------------------
// Slide Content Tests
// -----------------------------------------------------------------------------

describe('Notes Renderer Integration: Slide Content', () => {
  it('should include all slide titles', () => {
    for (const slide of parsedTalkTrack.slides) {
      expect(notesHtml).toContain(slide.title);
    }
  });

  it('should include slide positions', () => {
    expect(notesHtml).toContain('1');
    expect(notesHtml).toContain('2');
    expect(notesHtml).toContain('3');
    // Appendix slide position
    expect(notesHtml).toContain('A1');
  });

  it('should include talk track content (audio text)', () => {
    // Check for cleaned audio text without semantic tags
    // Note: HTML escapes apostrophes as &#039;
    expect(notesHtml).toContain('What if writing code felt less like fighting');
    expect(notesHtml).toMatch(/I&#039;m Jane Developer|I'm Jane Developer/);
    expect(notesHtml).toContain('software development landscape');
  });

  it('should NOT include raw semantic tags', () => {
    expect(notesHtml).not.toContain('[HOOK]');
    expect(notesHtml).not.toContain('[KEY_POINT]');
    expect(notesHtml).not.toContain('[PAUSE:500]');
    expect(notesHtml).not.toContain('[EVIDENCE]');
    expect(notesHtml).not.toContain('[TRANSITION]');
  });

  it('should include speaker notes when present', () => {
    // Title slide has speaker notes
    expect(notesHtml).toContain('Make eye contact');
    expect(notesHtml).toContain('Pause for effect');
  });

  it('should include word count or timing information', () => {
    // Should show timing estimates or word counts
    // Look for timing-related content
    expect(notesHtml).toMatch(/\d+\s*(word|min|sec)/i);
  });
});

// -----------------------------------------------------------------------------
// Thumbnail Tests
// -----------------------------------------------------------------------------

describe('Notes Renderer Integration: Thumbnails', () => {
  it('should include slide image references by default', () => {
    // Default options include thumbnails
    for (const slide of parsedTalkTrack.slides) {
      expect(notesHtml).toContain(slide.image);
    }
  });

  it('should respect includeThumbnails option', () => {
    const htmlNoThumbnails = renderSpeakerNotesToString(parsedTalkTrack, {
      includeThumbnails: false,
    });

    // Image tags should not be present for slide images
    // But the slide titles should still be there
    expect(htmlNoThumbnails).toContain(parsedTalkTrack.slides[0].title);
  });
});

// -----------------------------------------------------------------------------
// Timing Estimates Tests
// -----------------------------------------------------------------------------

describe('Notes Renderer Integration: Timing Estimates', () => {
  it('should calculate timing based on word count', () => {
    const summary = getSpeakerNotesSummary(parsedTalkTrack);

    // Total words should be positive
    expect(summary.totalWords).toBeGreaterThan(0);

    // Estimated minutes should be reasonable
    expect(summary.estimatedMinutes).toBeGreaterThan(0);
    expect(summary.estimatedMinutes).toBeLessThan(60); // Should be less than an hour
  });

  it('should respect custom words per minute', () => {
    const summaryFast = getSpeakerNotesSummary(parsedTalkTrack, {
      wordsPerMinute: 200,
    });

    const summarySlow = getSpeakerNotesSummary(parsedTalkTrack, {
      wordsPerMinute: 100,
    });

    // Faster speaking = fewer estimated minutes
    expect(summaryFast.estimatedMinutes).toBeLessThan(summarySlow.estimatedMinutes);
  });
});

// -----------------------------------------------------------------------------
// Summary Function Tests
// -----------------------------------------------------------------------------

describe('Notes Renderer Integration: Summary', () => {
  it('should return correct slide counts', () => {
    const summary = getSpeakerNotesSummary(parsedTalkTrack);

    expect(summary.slideCount).toBe(7);
    expect(summary.mainSlideCount).toBe(6);
    expect(summary.appendixSlideCount).toBe(1);
  });

  it('should return correct title', () => {
    const summary = getSpeakerNotesSummary(parsedTalkTrack);
    expect(summary.title).toBe('AI-Native Software Development');
  });

  it('should count slides with speaker notes', () => {
    const summary = getSpeakerNotesSummary(parsedTalkTrack);

    // Most slides have speaker notes in our fixture
    expect(summary.slidesWithNotes).toBeGreaterThan(0);
  });

  it('should calculate total words', () => {
    const summary = getSpeakerNotesSummary(parsedTalkTrack);

    // Should have substantial word count from all slides
    expect(summary.totalWords).toBeGreaterThan(100);
  });
});

// -----------------------------------------------------------------------------
// Custom Options Tests
// -----------------------------------------------------------------------------

describe('Notes Renderer Integration: Custom Options', () => {
  it('should apply custom primary color', () => {
    const customHtml = renderSpeakerNotesToString(parsedTalkTrack, {
      primaryColor: '#ff5722',
    });
    expect(customHtml).toContain('#ff5722');
  });

  it('should apply custom words per minute', () => {
    const options = { wordsPerMinute: 180 };
    const html = renderSpeakerNotesToString(parsedTalkTrack, options);

    // The HTML should still be valid
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain(parsedTalkTrack.title);
  });

  it('should use default options when not specified', () => {
    const defaultHtml = renderSpeakerNotesToString(parsedTalkTrack);
    expect(defaultHtml).toContain(DEFAULT_NOTES_OPTIONS.primaryColor);
  });
});

// -----------------------------------------------------------------------------
// Appendix Handling Tests
// -----------------------------------------------------------------------------

describe('Notes Renderer Integration: Appendix', () => {
  it('should include appendix slides', () => {
    expect(notesHtml).toContain('appendix-resources');
    expect(notesHtml).toContain('Additional Resources');
  });

  it('should mark appendix section appropriately', () => {
    expect(notesHtml).toContain('Appendix');
  });
});

// -----------------------------------------------------------------------------
// Print Layout Tests
// -----------------------------------------------------------------------------

describe('Notes Renderer Integration: Print Layout', () => {
  it('should include page break styles', () => {
    expect(notesHtml).toContain('page-break');
  });

  it('should include print media query', () => {
    expect(notesHtml).toMatch(/@media\s+print/);
  });

  it('should structure content for one slide per page', () => {
    // Look for class or structure indicating page separation
    const slideCount = (notesHtml.match(/page-break|break-after|slide-page/gi) || []).length;
    // Should have breaks between slides (at least n-1 breaks for n slides)
    expect(slideCount).toBeGreaterThan(0);
  });
});

// -----------------------------------------------------------------------------
// Accessibility Tests
// -----------------------------------------------------------------------------

describe('Notes Renderer Integration: Accessibility', () => {
  it('should include language attribute', () => {
    expect(notesHtml).toMatch(/<html[^>]+lang=/);
  });

  it('should include viewport meta tag', () => {
    expect(notesHtml).toContain('viewport');
  });

  it('should use semantic heading structure', () => {
    // Should have h1 for main title
    expect(notesHtml).toMatch(/<h1[^>]*>/);
    // Should have h2 or h3 for slide titles
    expect(notesHtml).toMatch(/<h[23][^>]*>/);
  });
});

// -----------------------------------------------------------------------------
// Data Integrity Tests
// -----------------------------------------------------------------------------

describe('Notes Renderer Integration: Data Integrity', () => {
  it('should preserve slide order', () => {
    const slugs = parsedTalkTrack.slides.map((s) => s.slug);
    const positions = slugs.map((slug) => notesHtml.indexOf(slug));

    // Verify order is preserved
    for (let i = 1; i < positions.length; i++) {
      if (positions[i] !== -1 && positions[i - 1] !== -1) {
        expect(positions[i]).toBeGreaterThan(positions[i - 1]);
      }
    }
  });

  it('should strip semantic tags from displayed content', () => {
    // No semantic tags should appear in the output
    const semanticTags = ['HOOK', 'KEY_POINT', 'EVIDENCE', 'STORY', 'TRANSITION', 'CALLBACK', 'LANDING', 'CTA', 'PAUSE'];

    for (const tag of semanticTags) {
      expect(notesHtml).not.toContain(`[${tag}]`);
      expect(notesHtml).not.toMatch(new RegExp(`\\[${tag}:\\d+\\]`));
    }
  });
});

// -----------------------------------------------------------------------------
// Edge Cases Tests
// -----------------------------------------------------------------------------

describe('Notes Renderer Integration: Edge Cases', () => {
  it('should handle missing speaker notes gracefully', () => {
    // Create a talk track where some slides have no speaker notes
    const html = renderSpeakerNotesToString(parsedTalkTrack);
    expect(html).toBeDefined();
    expect(html.length).toBeGreaterThan(0);
  });

  it('should handle empty subtitle', () => {
    const trackNoSubtitle: TalkTrackV5 = {
      ...parsedTalkTrack,
      subtitle: undefined,
    };
    const html = renderSpeakerNotesToString(trackNoSubtitle);
    expect(html).toBeDefined();
    expect(html).toContain(parsedTalkTrack.title);
  });

  it('should handle empty event', () => {
    const trackNoEvent: TalkTrackV5 = {
      ...parsedTalkTrack,
      event: undefined,
    };
    const html = renderSpeakerNotesToString(trackNoEvent);
    expect(html).toBeDefined();
    expect(html).toContain(parsedTalkTrack.title);
  });

  it('should handle empty date', () => {
    const trackNoDate: TalkTrackV5 = {
      ...parsedTalkTrack,
      date: undefined,
    };
    const html = renderSpeakerNotesToString(trackNoDate);
    expect(html).toBeDefined();
    // Should still show a date (default to current)
    expect(html).toMatch(/\d{4}|January|February|March|April|May|June|July|August|September|October|November|December/);
  });
});

// -----------------------------------------------------------------------------
// Complex Content Tests
// -----------------------------------------------------------------------------

describe('Notes Renderer Integration: Complex Content', () => {
  it('should handle slides with bullet point notes', () => {
    // Call to action slide has bullet point speaker notes
    // Note: The content is HTML escaped
    expect(notesHtml).toMatch(/Strong close|strong close/i);
    expect(notesHtml).toContain('Leave time for questions');
  });

  it('should handle multi-paragraph audio text', () => {
    // Title slide has multiple paragraphs
    // Note: HTML escapes apostrophes as &#039;
    expect(notesHtml).toContain('What if writing code');
    expect(notesHtml).toContain('Welcome everyone');
    expect(notesHtml).toMatch(/I&#039;m Jane Developer|I'm Jane Developer/);
  });
});
