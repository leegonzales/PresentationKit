/**
 * Parser Integration Tests
 *
 * Integration tests for the Talk Track v5 parser using a complete
 * sample talk track fixture file.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  parseTalkTrack,
  safeParseTalkTrack,
  extractFrontmatter,
  validateTalkTrack,
  stripSemanticTags,
  TalkTrackParseError,
} from '../../src/parsers/index.js';
import type { TalkTrackV5, SemanticTagType } from '../../src/parsers/types.js';

// Get the directory of this test file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the sample talk track fixture
const FIXTURE_PATH = join(__dirname, '../fixtures/sample-talk-track.md');

// Load fixture content
let fixtureContent: string;
let parsedTalkTrack: TalkTrackV5;

beforeAll(() => {
  fixtureContent = readFileSync(FIXTURE_PATH, 'utf-8');
  parsedTalkTrack = parseTalkTrack(fixtureContent);
});

// -----------------------------------------------------------------------------
// Frontmatter Parsing Tests
// -----------------------------------------------------------------------------

describe('Parser Integration: Frontmatter', () => {
  it('should parse version correctly', () => {
    expect(parsedTalkTrack.version).toBe(5);
  });

  it('should parse title and subtitle', () => {
    expect(parsedTalkTrack.title).toBe('AI-Native Software Development');
    expect(parsedTalkTrack.subtitle).toBe('Building the Future of Code');
  });

  it('should parse author information', () => {
    expect(parsedTalkTrack.author).toBe('Jane Developer');
  });

  it('should parse event and date', () => {
    expect(parsedTalkTrack.event).toBe('TechConf 2026');
    expect(parsedTalkTrack.date).toBe('2026-03-15');
  });

  it('should parse target minutes', () => {
    expect(parsedTalkTrack.targetMinutes).toBe(15);
  });

  it('should parse audio voice', () => {
    expect(parsedTalkTrack.audioVoice).toBe('af_heart');
  });

  it('should parse branding configuration', () => {
    expect(parsedTalkTrack.branding).toBeDefined();
    expect(parsedTalkTrack.branding?.primary).toBe('#2563eb');
    expect(parsedTalkTrack.branding?.background).toBe('#1e1e2e');
    expect(parsedTalkTrack.branding?.text).toBe('#f8fafc');
  });
});

// -----------------------------------------------------------------------------
// Sections Parsing Tests
// -----------------------------------------------------------------------------

describe('Parser Integration: Sections', () => {
  it('should parse all sections', () => {
    expect(parsedTalkTrack.sections).toHaveLength(5);
  });

  it('should parse section IDs correctly', () => {
    const sectionIds = parsedTalkTrack.sections.map((s) => s.id);
    expect(sectionIds).toEqual(['opening', 'problem', 'solution', 'closing', 'appendix']);
  });

  it('should parse section names correctly', () => {
    const sectionNames = parsedTalkTrack.sections.map((s) => s.name);
    expect(sectionNames).toEqual(['Opening', 'The Problem', 'Our Solution', 'Closing', 'Appendix']);
  });

  it('should parse section colors correctly', () => {
    const openingSection = parsedTalkTrack.sections.find((s) => s.id === 'opening');
    expect(openingSection?.color).toBe('#557373');

    const problemSection = parsedTalkTrack.sections.find((s) => s.id === 'problem');
    expect(problemSection?.color).toBe('#6B4C4C');
  });
});

// -----------------------------------------------------------------------------
// Slides Table Parsing Tests
// -----------------------------------------------------------------------------

describe('Parser Integration: Slides Table', () => {
  it('should parse all slides', () => {
    expect(parsedTalkTrack.slides).toHaveLength(7);
  });

  it('should parse slide positions correctly', () => {
    const positions = parsedTalkTrack.slides.map((s) => s.position);
    expect(positions).toEqual(['1', '2', '3', '4', '5', '6', 'A1']);
  });

  it('should parse slide slugs correctly', () => {
    const slugs = parsedTalkTrack.slides.map((s) => s.slug);
    expect(slugs).toContain('title-slide');
    expect(slugs).toContain('hook-problem');
    expect(slugs).toContain('appendix-resources');
  });

  it('should parse slide titles correctly', () => {
    const titleSlide = parsedTalkTrack.slides.find((s) => s.slug === 'title-slide');
    expect(titleSlide?.title).toBe('Welcome to AI-Native Dev');
  });

  it('should parse slide images correctly', () => {
    const titleSlide = parsedTalkTrack.slides.find((s) => s.slug === 'title-slide');
    expect(titleSlide?.image).toBe('slide-01-title.png');
  });

  it('should parse slide sections correctly', () => {
    const hookSlide = parsedTalkTrack.slides.find((s) => s.slug === 'hook-problem');
    expect(hookSlide?.section).toBe('problem');

    const appendixSlide = parsedTalkTrack.slides.find((s) => s.slug === 'appendix-resources');
    expect(appendixSlide?.section).toBe('appendix');
  });

  it('should correctly identify appendix slides', () => {
    const appendixSlides = parsedTalkTrack.slides.filter((s) =>
      s.position.startsWith('A') || s.section === 'appendix'
    );
    expect(appendixSlides).toHaveLength(1);
    expect(appendixSlides[0].slug).toBe('appendix-resources');
  });
});

// -----------------------------------------------------------------------------
// Slide Content Parsing Tests
// -----------------------------------------------------------------------------

describe('Parser Integration: Slide Content', () => {
  it('should parse all slide content', () => {
    expect(parsedTalkTrack.slideContent.size).toBe(7);
  });

  it('should match slide content to slides table', () => {
    for (const slide of parsedTalkTrack.slides) {
      const content = parsedTalkTrack.slideContent.get(slide.slug);
      expect(content).toBeDefined();
      expect(content?.slug).toBe(slide.slug);
    }
  });

  it('should parse audio text from AUDIO blocks', () => {
    const titleContent = parsedTalkTrack.slideContent.get('title-slide');
    expect(titleContent?.audioText).toContain('What if writing code felt less like fighting');
    expect(titleContent?.audioText).toContain("I'm Jane Developer");
  });

  it('should parse speaker notes', () => {
    const titleContent = parsedTalkTrack.slideContent.get('title-slide');
    expect(titleContent?.speakerNotes).toBeDefined();
    expect(titleContent?.speakerNotes).toContain('Make eye contact');
    expect(titleContent?.speakerNotes).toContain('Pause for effect');
  });

  it('should parse image path from markdown image syntax', () => {
    const hookContent = parsedTalkTrack.slideContent.get('hook-problem');
    expect(hookContent?.imagePath).toBe('images/slide-02-hook.png');
  });
});

// -----------------------------------------------------------------------------
// Semantic Tag Extraction Tests
// -----------------------------------------------------------------------------

describe('Parser Integration: Semantic Tags', () => {
  it('should extract HOOK tag', () => {
    const titleContent = parsedTalkTrack.slideContent.get('title-slide');
    const hookTags = titleContent?.semanticTags.filter((t) => t.type === 'HOOK');
    expect(hookTags?.length).toBeGreaterThan(0);
  });

  it('should extract KEY_POINT tags', () => {
    const hookContent = parsedTalkTrack.slideContent.get('hook-problem');
    const keyPoints = hookContent?.semanticTags.filter((t) => t.type === 'KEY_POINT');
    expect(keyPoints?.length).toBeGreaterThan(0);
  });

  it('should extract EVIDENCE tag', () => {
    const statsContent = parsedTalkTrack.slideContent.get('evidence-stats');
    const evidenceTags = statsContent?.semanticTags.filter((t) => t.type === 'EVIDENCE');
    expect(evidenceTags?.length).toBeGreaterThan(0);
  });

  it('should extract TRANSITION tags', () => {
    const hookContent = parsedTalkTrack.slideContent.get('hook-problem');
    const transitions = hookContent?.semanticTags.filter((t) => t.type === 'TRANSITION');
    expect(transitions?.length).toBeGreaterThan(0);
  });

  it('should extract STORY tag', () => {
    const solutionContent = parsedTalkTrack.slideContent.get('solution-intro');
    const storyTags = solutionContent?.semanticTags.filter((t) => t.type === 'STORY');
    expect(storyTags?.length).toBeGreaterThan(0);
  });

  it('should extract CALLBACK tag', () => {
    const demoContent = parsedTalkTrack.slideContent.get('demo-walkthrough');
    const callbackTags = demoContent?.semanticTags.filter((t) => t.type === 'CALLBACK');
    expect(callbackTags?.length).toBeGreaterThan(0);
  });

  it('should extract LANDING tag', () => {
    const ctaContent = parsedTalkTrack.slideContent.get('call-to-action');
    const landingTags = ctaContent?.semanticTags.filter((t) => t.type === 'LANDING');
    expect(landingTags?.length).toBeGreaterThan(0);
  });

  it('should extract CTA tag', () => {
    const ctaContent = parsedTalkTrack.slideContent.get('call-to-action');
    const ctaTags = ctaContent?.semanticTags.filter((t) => t.type === 'CTA');
    expect(ctaTags?.length).toBeGreaterThan(0);
  });

  it('should collect all semantic tag types present in document', () => {
    const allTags = new Set<SemanticTagType>();
    for (const [, content] of parsedTalkTrack.slideContent) {
      for (const tag of content.semanticTags) {
        allTags.add(tag.type);
      }
    }

    expect(allTags.has('HOOK')).toBe(true);
    expect(allTags.has('KEY_POINT')).toBe(true);
    expect(allTags.has('EVIDENCE')).toBe(true);
    expect(allTags.has('TRANSITION')).toBe(true);
    expect(allTags.has('STORY')).toBe(true);
    expect(allTags.has('CALLBACK')).toBe(true);
    expect(allTags.has('LANDING')).toBe(true);
    expect(allTags.has('CTA')).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// PAUSE Marker Parsing Tests
// -----------------------------------------------------------------------------

describe('Parser Integration: PAUSE Markers', () => {
  it('should extract PAUSE markers', () => {
    const titleContent = parsedTalkTrack.slideContent.get('title-slide');
    const pauseTags = titleContent?.semanticTags.filter((t) => t.type === 'PAUSE');
    expect(pauseTags?.length).toBeGreaterThan(0);
  });

  it('should parse PAUSE duration correctly', () => {
    const titleContent = parsedTalkTrack.slideContent.get('title-slide');
    const pauseWithDuration = titleContent?.semanticTags.find(
      (t) => t.type === 'PAUSE' && t.duration !== undefined
    );
    expect(pauseWithDuration?.duration).toBe(500);
  });

  it('should parse different PAUSE durations', () => {
    const hookContent = parsedTalkTrack.slideContent.get('hook-problem');
    const pauseTag = hookContent?.semanticTags.find((t) => t.type === 'PAUSE');
    expect(pauseTag?.duration).toBe(300);
  });

  it('should count total PAUSE markers in document', () => {
    let totalPauses = 0;
    for (const [, content] of parsedTalkTrack.slideContent) {
      const pauses = content.semanticTags.filter((t) => t.type === 'PAUSE');
      totalPauses += pauses.length;
    }
    expect(totalPauses).toBeGreaterThanOrEqual(4);
  });
});

// -----------------------------------------------------------------------------
// Utility Function Tests
// -----------------------------------------------------------------------------

describe('Parser Integration: Utility Functions', () => {
  it('extractFrontmatter should return raw frontmatter', () => {
    const frontmatter = extractFrontmatter(fixtureContent);
    expect(frontmatter.version).toBe(5);
    expect(frontmatter.title).toBe('AI-Native Software Development');
    expect(frontmatter.target_minutes).toBe(15);
    expect(frontmatter.audio_voice).toBe('af_heart');
  });

  it('validateTalkTrack should return no errors for valid content', () => {
    const errors = validateTalkTrack(fixtureContent);
    expect(errors).toEqual([]);
  });

  it('safeParseTalkTrack should return success result', () => {
    const result = safeParseTalkTrack(fixtureContent);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.errors).toBeUndefined();
  });

  it('stripSemanticTags should clean audio text', () => {
    const titleContent = parsedTalkTrack.slideContent.get('title-slide');
    const cleaned = stripSemanticTags(titleContent?.audioText || '');

    expect(cleaned).not.toContain('[HOOK]');
    expect(cleaned).not.toContain('[PAUSE:500]');
    expect(cleaned).toContain('What if writing code');
    expect(cleaned).toContain("I'm Jane Developer");
  });
});

// -----------------------------------------------------------------------------
// Error Handling Tests
// -----------------------------------------------------------------------------

describe('Parser Integration: Error Handling', () => {
  it('should throw TalkTrackParseError for missing frontmatter', () => {
    const content = '# No Frontmatter\n\nJust some content.';
    expect(() => parseTalkTrack(content)).toThrow(TalkTrackParseError);
  });

  it('should throw TalkTrackParseError for invalid version', () => {
    const content = fixtureContent.replace('version: 5', 'version: 4');
    expect(() => parseTalkTrack(content)).toThrow(TalkTrackParseError);
  });

  it('should throw TalkTrackParseError for missing required fields', () => {
    const content = `---
version: 5
title: "Test"
---

## Slides

| # | Slug | Title | Image | Section |
|---|------|-------|-------|---------|
`;
    expect(() => parseTalkTrack(content)).toThrow(TalkTrackParseError);
  });

  it('safeParseTalkTrack should return errors for invalid content', () => {
    const result = safeParseTalkTrack('Invalid content');
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
  });
});
