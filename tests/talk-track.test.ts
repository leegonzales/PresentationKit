/**
 * Talk Track v5 Parser Tests
 */

import { describe, it, expect } from 'vitest';
import {
  parseTalkTrack,
  safeParseTalkTrack,
  validateTalkTrack,
  stripSemanticTags,
  TalkTrackParseError,
} from '../src/parsers/talk-track.js';
import {
  validateSlug,
  validateSection,
  validateImagePath,
  validateHexColor,
  findDuplicateSlugs,
} from '../src/parsers/validators.js';

// -----------------------------------------------------------------------------
// Sample Talk Track Content
// -----------------------------------------------------------------------------

const VALID_TALK_TRACK = `---
version: 5
title: "Test Presentation"
subtitle: "A Subtitle"
author: "Test Author"
event: "Test Event"
date: "2026-01-21"
target_minutes: 30
audio_voice: "af_heart"

sections:
  - id: opening
    name: "Opening"
    color: "#557373"
  - id: main
    name: "Main Content"
    color: "#6B4C4C"
---

## Slides

| # | Slug | Title | Image | Section |
|---|------|-------|-------|---------|
| 1 | title | Title Slide | slide-title.png | opening |
| 2 | intro | Introduction | slide-intro.png | opening |
| 3 | content | Main Content | slide-content.png | main |

## [title] Title Slide

![Title](images/slide-title.png)

<!-- AUDIO -->
[HOOK] Welcome to my presentation.

This is the opening slide.
<!-- /AUDIO -->

**Speaker Notes:**
Remember to smile.

---

## [intro] Introduction

![Intro](images/slide-intro.png)

<!-- AUDIO -->
Let me introduce the topic.

[KEY_POINT] The key insight is this.

[PAUSE:500]

Now let's continue.
<!-- /AUDIO -->

---

## [content] Main Content

![Content](images/slide-content.png)

<!-- AUDIO -->
[TRANSITION] Moving on to the main content.

[EVIDENCE] Studies show this is true.

Here's the explanation.
<!-- /AUDIO -->

**Speaker Notes:**
- Point one
- Point two
`;

const MINIMAL_TALK_TRACK = `---
version: 5
title: "Minimal"
author: "Author"
target_minutes: 10

sections:
  - id: main
    name: "Main"
    color: "#000000"
---

## Slides

| # | Slug | Title | Image | Section |
|---|------|-------|-------|---------|
| 1 | slide1 | First | slide.png | main |

## [slide1] First

![First](images/slide.png)

<!-- AUDIO -->
Content here.
<!-- /AUDIO -->
`;

// -----------------------------------------------------------------------------
// Validator Tests
// -----------------------------------------------------------------------------

describe('validators', () => {
  describe('validateSlug', () => {
    it('accepts valid slugs', () => {
      expect(validateSlug('title')).toBe(true);
      expect(validateSlug('my-slide')).toBe(true);
      expect(validateSlug('slide1')).toBe(true);
      expect(validateSlug('a1b2c3')).toBe(true);
      expect(validateSlug('intro-section-1')).toBe(true);
    });

    it('rejects invalid slugs', () => {
      expect(validateSlug('MySlide')).toBe(false);
      expect(validateSlug('my_slide')).toBe(false);
      expect(validateSlug('1slide')).toBe(false);
      expect(validateSlug('-slide')).toBe(false);
      expect(validateSlug('slide-')).toBe(false);
      expect(validateSlug('')).toBe(false);
    });
  });

  describe('validateSection', () => {
    const sections = [
      { id: 'opening', name: 'Opening', color: '#000' },
      { id: 'main', name: 'Main', color: '#fff' },
    ];

    it('accepts valid sections', () => {
      expect(validateSection('opening', sections)).toBe(true);
      expect(validateSection('main', sections)).toBe(true);
    });

    it('rejects unknown sections', () => {
      expect(validateSection('unknown', sections)).toBe(false);
      expect(validateSection('', sections)).toBe(false);
    });
  });

  describe('validateImagePath', () => {
    it('accepts valid image paths', () => {
      expect(validateImagePath('slide.png')).toBe(true);
      expect(validateImagePath('images/slide.jpg')).toBe(true);
      expect(validateImagePath('path/to/image.webp')).toBe(true);
    });

    it('rejects invalid paths', () => {
      expect(validateImagePath('/absolute/path.png')).toBe(false);
      expect(validateImagePath('file.txt')).toBe(false);
      expect(validateImagePath('')).toBe(false);
    });
  });

  describe('validateHexColor', () => {
    it('accepts valid hex colors', () => {
      expect(validateHexColor('#000')).toBe(true);
      expect(validateHexColor('#fff')).toBe(true);
      expect(validateHexColor('#000000')).toBe(true);
      expect(validateHexColor('#FFFFFF')).toBe(true);
      expect(validateHexColor('#557373')).toBe(true);
    });

    it('rejects invalid colors', () => {
      expect(validateHexColor('000000')).toBe(false);
      expect(validateHexColor('#00')).toBe(false);
      expect(validateHexColor('#0000000')).toBe(false);
      expect(validateHexColor('red')).toBe(false);
    });
  });

  describe('findDuplicateSlugs', () => {
    it('finds duplicates', () => {
      expect(findDuplicateSlugs(['a', 'b', 'a', 'c'])).toEqual(['a']);
      expect(findDuplicateSlugs(['a', 'a', 'a'])).toEqual(['a']);
      expect(findDuplicateSlugs(['a', 'b', 'a', 'b'])).toEqual(['a', 'b']);
    });

    it('returns empty for unique slugs', () => {
      expect(findDuplicateSlugs(['a', 'b', 'c'])).toEqual([]);
      expect(findDuplicateSlugs([])).toEqual([]);
    });
  });
});

// -----------------------------------------------------------------------------
// Parser Tests
// -----------------------------------------------------------------------------

describe('parseTalkTrack', () => {
  it('parses valid talk track', () => {
    const result = parseTalkTrack(VALID_TALK_TRACK);

    expect(result.version).toBe(5);
    expect(result.title).toBe('Test Presentation');
    expect(result.subtitle).toBe('A Subtitle');
    expect(result.author).toBe('Test Author');
    expect(result.event).toBe('Test Event');
    expect(result.date).toBe('2026-01-21');
    expect(result.targetMinutes).toBe(30);
    expect(result.audioVoice).toBe('af_heart');
  });

  it('parses sections correctly', () => {
    const result = parseTalkTrack(VALID_TALK_TRACK);

    expect(result.sections).toHaveLength(2);
    expect(result.sections[0]).toEqual({
      id: 'opening',
      name: 'Opening',
      color: '#557373',
    });
  });

  it('parses slides table correctly', () => {
    const result = parseTalkTrack(VALID_TALK_TRACK);

    expect(result.slides).toHaveLength(3);
    expect(result.slides[0]).toEqual({
      position: '1',
      slug: 'title',
      title: 'Title Slide',
      image: 'slide-title.png',
      section: 'opening',
    });
  });

  it('parses slide content correctly', () => {
    const result = parseTalkTrack(VALID_TALK_TRACK);

    expect(result.slideContent.size).toBe(3);

    const titleSlide = result.slideContent.get('title');
    expect(titleSlide).toBeDefined();
    expect(titleSlide?.slug).toBe('title');
    expect(titleSlide?.title).toBe('Title Slide');
    expect(titleSlide?.audioText).toContain('Welcome to my presentation');
    expect(titleSlide?.speakerNotes).toContain('Remember to smile');
  });

  it('parses semantic tags correctly', () => {
    const result = parseTalkTrack(VALID_TALK_TRACK);

    const introSlide = result.slideContent.get('intro');
    expect(introSlide?.semanticTags).toContainEqual(
      expect.objectContaining({ type: 'KEY_POINT' }),
    );
    expect(introSlide?.semanticTags).toContainEqual(
      expect.objectContaining({ type: 'PAUSE', duration: 500 }),
    );
  });

  it('parses minimal talk track', () => {
    const result = parseTalkTrack(MINIMAL_TALK_TRACK);

    expect(result.version).toBe(5);
    expect(result.title).toBe('Minimal');
    expect(result.audioVoice).toBe('af_heart'); // Default
    expect(result.slides).toHaveLength(1);
  });

  it('throws on missing frontmatter', () => {
    expect(() => parseTalkTrack('No frontmatter here')).toThrow(TalkTrackParseError);
  });

  it('throws on wrong version', () => {
    const content = MINIMAL_TALK_TRACK.replace('version: 5', 'version: 4');
    expect(() => parseTalkTrack(content)).toThrow(TalkTrackParseError);
  });
});

describe('safeParseTalkTrack', () => {
  it('returns success for valid content', () => {
    const result = safeParseTalkTrack(VALID_TALK_TRACK);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.errors).toBeUndefined();
  });

  it('returns errors for invalid content', () => {
    const result = safeParseTalkTrack('Invalid content');

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);
  });
});

describe('stripSemanticTags', () => {
  it('removes all semantic tags', () => {
    const input = '[HOOK] Hello world. [PAUSE] [KEY_POINT] Important. [PAUSE:500]';
    const result = stripSemanticTags(input);

    expect(result).not.toContain('[HOOK]');
    expect(result).not.toContain('[PAUSE]');
    expect(result).not.toContain('[KEY_POINT]');
    expect(result).not.toContain('[PAUSE:500]');
    expect(result).toContain('Hello world');
    expect(result).toContain('Important');
  });
});

describe('validateTalkTrack', () => {
  it('returns empty array for valid content', () => {
    const errors = validateTalkTrack(VALID_TALK_TRACK);
    expect(errors).toEqual([]);
  });

  it('returns errors for invalid content', () => {
    const errors = validateTalkTrack('Invalid');
    expect(errors.length).toBeGreaterThan(0);
  });
});
