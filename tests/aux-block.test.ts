/**
 * AUX Block Tests
 *
 * Tests for the <!-- AUX --> block parsing and HTML rendering.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseTalkTrack } from '../src/parsers/talk-track.js';
import { renderHtmlPresentationToString } from '../src/renderers/html/index.js';
import type { TalkTrackV5 } from '../src/parsers/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURE_PATH = join(__dirname, 'fixtures/aux-block-talk-track.md');

let fixtureContent: string;
let parsedTalkTrack: TalkTrackV5;
let htmlOutput: string;

beforeAll(() => {
    fixtureContent = readFileSync(FIXTURE_PATH, 'utf-8');
    parsedTalkTrack = parseTalkTrack(fixtureContent);
    htmlOutput = renderHtmlPresentationToString(parsedTalkTrack, null);
});

// --------------------------------------------------------------------------
// Parser Tests
// --------------------------------------------------------------------------

describe('AUX Block Parsing', () => {
    it('parses AUX block from slide content', () => {
        const slideWithAux = parsedTalkTrack.slideContent.get('with-aux');
        expect(slideWithAux).toBeDefined();
        expect(slideWithAux!.auxContent).toBeDefined();
        expect(slideWithAux!.auxContent!.title).toBe('RANGE Evaluator Prompt');
        expect(slideWithAux!.auxContent!.body).toContain('You are an AI evaluator');
        expect(slideWithAux!.auxContent!.body).toContain('## Scoring Criteria');
    });

    it('preserves AUX block body including markdown formatting', () => {
        const slideWithAux = parsedTalkTrack.slideContent.get('with-aux');
        const body = slideWithAux!.auxContent!.body;

        // Check markdown elements are preserved
        expect(body).toContain('**Reach**');
        expect(body).toContain('**Autonomy**');
        expect(body).toContain('**Navigation**');
        expect(body).toContain('```');
        expect(body).toContain('> Note:');
    });

    it('returns undefined auxContent for slides without AUX block', () => {
        const slideWithoutAux = parsedTalkTrack.slideContent.get('no-aux');
        expect(slideWithoutAux).toBeDefined();
        expect(slideWithoutAux!.auxContent).toBeUndefined();
    });

    it('does not affect AUDIO block parsing', () => {
        const slideWithAux = parsedTalkTrack.slideContent.get('with-aux');
        expect(slideWithAux!.audioText).toBe(
            'This slide has auxiliary content you can copy.',
        );
    });

    it('does not include AUX content in audio text', () => {
        const slideWithAux = parsedTalkTrack.slideContent.get('with-aux');
        expect(slideWithAux!.audioText).not.toContain('AI evaluator');
        expect(slideWithAux!.audioText).not.toContain('Scoring Criteria');
    });

    it('preserves speaker notes alongside AUX block', () => {
        const slideWithAux = parsedTalkTrack.slideContent.get('with-aux');
        expect(slideWithAux!.speakerNotes).toContain('Show participants');
    });
});

// --------------------------------------------------------------------------
// HTML Rendering Tests
// --------------------------------------------------------------------------

describe('AUX Drawer HTML Rendering', () => {
    it('includes AUX pill button in HTML output', () => {
        expect(htmlOutput).toContain('id="auxPill"');
        expect(htmlOutput).toContain('id="auxPillText"');
    });

    it('includes AUX drawer container in HTML output', () => {
        expect(htmlOutput).toContain('id="auxDrawer"');
        expect(htmlOutput).toContain('id="auxDrawerTitle"');
        expect(htmlOutput).toContain('id="auxDrawerContent"');
    });

    it('includes AUX drawer backdrop in HTML output', () => {
        expect(htmlOutput).toContain('id="auxDrawerBackdrop"');
    });

    it('includes copy-to-clipboard button', () => {
        expect(htmlOutput).toContain('id="auxCopyBtn"');
        expect(htmlOutput).toContain('copyAuxContent');
    });

    it('includes AUX content data in slide JavaScript', () => {
        expect(htmlOutput).toContain('auxContent:');
        // Slide with AUX should have non-null auxContent
        expect(htmlOutput).toContain("title: 'RANGE Evaluator Prompt'");
        // Slide without AUX should have null auxContent
        expect(htmlOutput).toMatch(/auxContent: null/);
    });

    it('includes toggleAuxDrawer function', () => {
        expect(htmlOutput).toContain('function toggleAuxDrawer');
    });

    it('includes renderAuxMarkdown function', () => {
        expect(htmlOutput).toContain('function renderAuxMarkdown');
    });

    it('includes AUX drawer CSS styles', () => {
        expect(htmlOutput).toContain('.aux-pill');
        expect(htmlOutput).toContain('.aux-drawer');
        expect(htmlOutput).toContain('.aux-drawer-content');
        expect(htmlOutput).toContain('.aux-copy-btn');
    });

    it('handles Escape key for AUX drawer', () => {
        expect(htmlOutput).toContain('showAuxDrawer');
    });
});

// --------------------------------------------------------------------------
// Edge Case Tests
// --------------------------------------------------------------------------

describe('AUX Block Edge Cases', () => {
    it('parses talk track with no AUX blocks at all', () => {
        const noAuxContent = `---
version: 5
title: "No AUX Test"
author: "Test"
target_minutes: 5
sections:
  - id: main
    name: "Main"
    color: "#557373"
---

## Slides

| # | Slug | Title | Image | Section |
|---|------|-------|-------|---------|
| 1 | slide-one | Slide One | s1.png | main |

## [slide-one] Slide One

![S1](images/s1.png)

<!-- AUDIO -->
Hello world.
<!-- /AUDIO -->
`;

        const parsed = parseTalkTrack(noAuxContent);
        const slide = parsed.slideContent.get('slide-one');
        expect(slide).toBeDefined();
        expect(slide!.auxContent).toBeUndefined();
    });

    it('handles AUX block with empty body', () => {
        const emptyBodyContent = `---
version: 5
title: "Empty AUX Test"
author: "Test"
target_minutes: 5
sections:
  - id: main
    name: "Main"
    color: "#557373"
---

## Slides

| # | Slug | Title | Image | Section |
|---|------|-------|-------|---------|
| 1 | slide-one | Slide One | s1.png | main |

## [slide-one] Slide One

![S1](images/s1.png)

<!-- AUDIO -->
Hello.
<!-- /AUDIO -->

<!-- AUX title="Empty" -->
<!-- /AUX -->
`;

        const parsed = parseTalkTrack(emptyBodyContent);
        const slide = parsed.slideContent.get('slide-one');
        expect(slide!.auxContent).toBeUndefined();
    });

    it('handles AUX block with special characters in title', () => {
        const specialTitleContent = `---
version: 5
title: "Special Title Test"
author: "Test"
target_minutes: 5
sections:
  - id: main
    name: "Main"
    color: "#557373"
---

## Slides

| # | Slug | Title | Image | Section |
|---|------|-------|-------|---------|
| 1 | slide-one | Slide One | s1.png | main |

## [slide-one] Slide One

![S1](images/s1.png)

<!-- AUDIO -->
Hello.
<!-- /AUDIO -->

<!-- AUX title="RANGE Evaluator (v2.1)" -->
Some content here.
<!-- /AUX -->
`;

        const parsed = parseTalkTrack(specialTitleContent);
        const slide = parsed.slideContent.get('slide-one');
        expect(slide!.auxContent).toBeDefined();
        expect(slide!.auxContent!.title).toBe('RANGE Evaluator (v2.1)');
    });
});
