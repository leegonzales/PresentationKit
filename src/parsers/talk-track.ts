/**
 * Talk Track v5 Parser
 *
 * Parses Talk Track v5 markdown files into structured data for
 * presentation and audio generation.
 */

import YAML from 'yaml';
import { z } from 'zod';
import type {
  TalkTrackV5,
  Section,
  SlideDefinition,
  SlideContent,
  SemanticTag,
  SemanticTagType,
  BrandConfig,
  RawFrontmatter,
} from './types.js';
import {
  validateSlug,
  validateSection,
  validateImagePath,
  validateHexColor,
  findDuplicateSlugs,
} from './validators.js';

// -----------------------------------------------------------------------------
// Zod Schemas
// -----------------------------------------------------------------------------

const SectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color'),
});

const BrandConfigSchema = z.object({
  primary: z.string().optional(),
  background: z.string().optional(),
  text: z.string().optional(),
});

const FrontmatterSchema = z.object({
  version: z.union([z.literal(5), z.literal(6)]),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  author: z.string().min(1),
  event: z.string().optional(),
  date: z.string().optional(),
  target_minutes: z.number().int().positive(),
  audio_voice: z.string().default('af_heart'),
  branding: z.union([z.string(), BrandConfigSchema]).optional(),
  show_speakers: z.boolean().optional(),
  sections: z.array(SectionSchema).min(1),
});

// -----------------------------------------------------------------------------
// Parser Error
// -----------------------------------------------------------------------------

export class TalkTrackParseError extends Error {
  constructor(
    message: string,
    public readonly errors: string[] = [],
  ) {
    super(message);
    this.name = 'TalkTrackParseError';
  }
}

// -----------------------------------------------------------------------------
// Frontmatter Parsing
// -----------------------------------------------------------------------------

/**
 * Extracts and parses YAML frontmatter from markdown content.
 */
function parseFrontmatter(content: string): RawFrontmatter {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new TalkTrackParseError('Missing YAML frontmatter (must start with ---)');
  }

  const yamlContent = frontmatterMatch[1];
  let parsed: unknown;

  try {
    parsed = YAML.parse(yamlContent);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    throw new TalkTrackParseError(`Invalid YAML frontmatter: ${message}`);
  }

  const result = FrontmatterSchema.safeParse(parsed);
  if (!result.success) {
    const errors = result.error.errors.map(
      (err) => `${err.path.join('.')}: ${err.message}`,
    );
    throw new TalkTrackParseError('Frontmatter validation failed', errors);
  }

  return result.data as RawFrontmatter;
}

// -----------------------------------------------------------------------------
// Slides Table Parsing
// -----------------------------------------------------------------------------

/**
 * Parses the slides table from markdown content.
 */
function parseSlidesTable(content: string, sections: Section[]): SlideDefinition[] {
  // Find the ## Slides section
  const slidesMatch = content.match(/## Slides\s*\n\n([\s\S]*?)(?=\n## \[|$)/);
  if (!slidesMatch) {
    throw new TalkTrackParseError('Missing ## Slides section');
  }

  const tableContent = slidesMatch[1].trim();
  // Filter empty lines and markdown separators (---)
  const lines = tableContent.split('\n').filter((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.match(/^-{3,}$/);
  });

  // Validate table structure
  if (lines.length < 3) {
    throw new TalkTrackParseError('Slides table must have header, separator, and at least one row');
  }

  // Parse header to understand column order
  const headerLine = lines[0];
  const headers = headerLine
    .split('|')
    .map((h) => h.trim().toLowerCase())
    .filter((h) => h);

  const expectedHeaders = ['#', 'slug', 'title', 'image', 'section'];
  const headerMap: Record<string, number> = {};

  for (const expected of expectedHeaders) {
    const index = headers.findIndex((h) => h === expected || h.includes(expected));
    if (index === -1) {
      throw new TalkTrackParseError(`Slides table missing "${expected}" column`);
    }
    headerMap[expected] = index;
  }

  // Skip header and separator lines
  const dataLines = lines.slice(2);
  const slides: SlideDefinition[] = [];
  const errors: string[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1 || c);

    // Handle edge case of leading/trailing pipes
    const values = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());

    if (values.length < expectedHeaders.length) {
      errors.push(`Row ${i + 1}: Not enough columns (expected ${expectedHeaders.length})`);
      continue;
    }

    const position = values[headerMap['#']];
    const slug = values[headerMap['slug']];
    const title = values[headerMap['title']];
    const image = values[headerMap['image']];
    const section = values[headerMap['section']];

    // Validate fields
    if (!validateSlug(slug)) {
      errors.push(`Row ${i + 1}: Invalid slug "${slug}" (must be lowercase-kebab-case)`);
    }

    if (!validateSection(section, sections)) {
      errors.push(`Row ${i + 1}: Unknown section "${section}"`);
    }

    if (!validateImagePath(image)) {
      errors.push(`Row ${i + 1}: Invalid image path "${image}"`);
    }

    // Normalize image path to ensure consistent images/ prefix
    const normalizedImage = normalizeImagePath(image);
    slides.push({ position, slug, title, image: normalizedImage, section });
  }

  // Check for duplicate slugs
  const duplicates = findDuplicateSlugs(slides.map((s) => s.slug));
  if (duplicates.length > 0) {
    errors.push(`Duplicate slugs found: ${duplicates.join(', ')}`);
  }

  if (errors.length > 0) {
    throw new TalkTrackParseError('Slides table validation failed', errors);
  }

  return slides;
}

// -----------------------------------------------------------------------------
// Semantic Tag Parsing
// -----------------------------------------------------------------------------

const SEMANTIC_TAG_TYPES: SemanticTagType[] = [
  'HOOK',
  'KEY_POINT',
  'EVIDENCE',
  'STORY',
  'TRANSITION',
  'CALLBACK',
  'LANDING',
  'CTA',
  'PAUSE',
];

/**
 * Parses semantic tags from audio text content.
 */
function parseSemanticTags(audioText: string): SemanticTag[] {
  const tags: SemanticTag[] = [];

  // Match tags like [HOOK], [KEY_POINT], [PAUSE], [PAUSE:500]
  const tagPattern = /\[(HOOK|KEY_POINT|EVIDENCE|STORY|TRANSITION|CALLBACK|LANDING|CTA|PAUSE)(?::(\d+))?\]/gi;

  let match;
  while ((match = tagPattern.exec(audioText)) !== null) {
    const type = match[1].toUpperCase() as SemanticTagType;
    const duration = match[2] ? parseInt(match[2], 10) : undefined;

    const tag: SemanticTag = { type };

    if (type === 'PAUSE' && duration !== undefined) {
      tag.duration = duration;
    }

    // For content tags, try to extract the following content
    if (type !== 'PAUSE') {
      const afterTag = audioText.slice(match.index + match[0].length);
      const contentMatch = afterTag.match(/^\s*(.+?)(?=\n\n|\[|$)/s);
      if (contentMatch) {
        tag.content = contentMatch[1].trim();
      }
    }

    tags.push(tag);
  }

  return tags;
}

/**
 * Extracts speaker name from audio text.
 * Matches **[NAME]** or *[NAME]* at the start of audio text.
 */
export function parseSpeakerLabel(audioText: string): string | undefined {
  const match = audioText.match(/^\s*\*{1,2}\[([A-Z_]+)\]\*{1,2}/);
  return match ? match[1] : undefined;
}

/**
 * Strips speaker label from audio text for clean TTS input.
 */
export function stripSpeakerLabel(audioText: string): string {
  return audioText.replace(/^\s*\*{1,2}\[([A-Z_]+)\]\*{1,2}\s*/m, '').trim();
}

/**
 * Strips semantic tags from audio text for clean TTS input.
 */
export function stripSemanticTags(audioText: string): string {
  return audioText
    .replace(/\[(HOOK|KEY_POINT|EVIDENCE|STORY|TRANSITION|CALLBACK|LANDING|CTA|PAUSE)(?::\d+)?\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// -----------------------------------------------------------------------------
// Image Path Normalization
// -----------------------------------------------------------------------------

/**
 * Normalizes an image path to ensure consistent `images/` prefix.
 * Handles various input formats:
 *   - `slide.png` → `images/slide.png`
 *   - `images/slide.png` → `images/slide.png` (unchanged)
 *   - `./images/slide.png` → `images/slide.png`
 *   - `../assets/slide.png` → `../assets/slide.png` (external paths unchanged)
 */
function normalizeImagePath(imagePath: string): string {
  if (!imagePath) return imagePath;

  // Already has images/ prefix
  if (imagePath.startsWith('images/')) {
    return imagePath;
  }

  // Has ./images/ prefix - normalize
  if (imagePath.startsWith('./images/')) {
    return imagePath.slice(2); // Remove './'
  }

  // External/relative paths (../, /, http://, etc.) - leave unchanged
  if (imagePath.startsWith('../') || imagePath.startsWith('/') || imagePath.includes('://')) {
    return imagePath;
  }

  // Plain filename or other relative path - add images/ prefix
  return `images/${imagePath}`;
}

// -----------------------------------------------------------------------------
// Slide Content Parsing
// -----------------------------------------------------------------------------

/**
 * Parses individual slide content sections.
 */
function parseSlideContent(content: string, slides: SlideDefinition[]): Map<string, SlideContent> {
  const slideContent = new Map<string, SlideContent>();
  const errors: string[] = [];

  // Match slide sections: ## [slug] Title
  const slidePattern = /## \[([^\]]+)\] ([^\n]+)\n([\s\S]*?)(?=\n## \[|$)/g;

  let match;
  while ((match = slidePattern.exec(content)) !== null) {
    const slug = match[1];
    const title = match[2].trim();
    const sectionContent = match[3];

    // Check if slug exists in slides table
    // If not, silently skip (allows extra content sections like appendix)
    const slideDef = slides.find((s) => s.slug === slug);
    if (!slideDef) {
      // Lenient mode: skip content sections not in slides table
      continue;
    }

    // Extract image and normalize path to ensure consistent images/ prefix
    const imageMatch = sectionContent.match(/!\[.*?\]\((.*?)\)/);
    const rawImagePath = imageMatch ? imageMatch[1] : slideDef.image;
    const imagePath = normalizeImagePath(rawImagePath);

    // Extract audio block
    const audioMatch = sectionContent.match(/<!-- AUDIO -->\n?([\s\S]*?)\n?<!-- \/AUDIO -->/);
    const rawAudioText = audioMatch ? audioMatch[1].trim() : '';

    if (!audioMatch) {
      errors.push(`Slide "${slug}": Missing <!-- AUDIO --> block`);
    }

    // Extract speaker label (e.g., **[JORDAN]**) before stripping
    const speaker = parseSpeakerLabel(rawAudioText);
    const audioText = speaker ? stripSpeakerLabel(rawAudioText) : rawAudioText;

    // Extract speaker notes
    const notesMatch = sectionContent.match(/\*\*Speaker Notes:\*\*\s*\n?([\s\S]*?)(?=\n---|\n## |$)/);
    const speakerNotes = notesMatch ? notesMatch[1].trim() : undefined;

    // Parse semantic tags
    const semanticTags = parseSemanticTags(audioText);

    slideContent.set(slug, {
      slug,
      title,
      imagePath,
      audioText,
      speakerNotes,
      semanticTags,
      speaker,
    });
  }

  // Check that all slides have content
  for (const slide of slides) {
    if (!slideContent.has(slide.slug)) {
      errors.push(`Missing content section for slide: "${slide.slug}"`);
    }
  }

  if (errors.length > 0) {
    throw new TalkTrackParseError('Slide content validation failed', errors);
  }

  return slideContent;
}

// -----------------------------------------------------------------------------
// Branding Parsing
// -----------------------------------------------------------------------------

/**
 * Parses branding configuration from frontmatter.
 */
function parseBranding(branding: string | BrandConfig | undefined): BrandConfig | undefined {
  if (!branding) {
    return undefined;
  }

  if (typeof branding === 'string') {
    // String branding is a theme identifier - convert to config
    // This is a placeholder; actual theme mapping would be implemented elsewhere
    return { primary: branding };
  }

  // Validate colors if present
  const errors: string[] = [];
  if (branding.primary && !validateHexColor(branding.primary)) {
    errors.push(`Invalid primary color: ${branding.primary}`);
  }
  if (branding.background && !validateHexColor(branding.background)) {
    errors.push(`Invalid background color: ${branding.background}`);
  }
  if (branding.text && !validateHexColor(branding.text)) {
    errors.push(`Invalid text color: ${branding.text}`);
  }

  if (errors.length > 0) {
    throw new TalkTrackParseError('Branding validation failed', errors);
  }

  return branding;
}

// -----------------------------------------------------------------------------
// Main Parser
// -----------------------------------------------------------------------------

/**
 * Parses a Talk Track v5 markdown document into structured data.
 *
 * @param content - The full markdown content of the talk track file
 * @returns Parsed TalkTrackV5 object
 * @throws TalkTrackParseError if parsing fails
 *
 * @example
 * ```typescript
 * import { parseTalkTrack } from './parsers/talk-track.js';
 * import { readFileSync } from 'fs';
 *
 * const content = readFileSync('talk-track.md', 'utf-8');
 * const talkTrack = parseTalkTrack(content);
 *
 * console.log(talkTrack.title);
 * console.log(talkTrack.slides.length);
 *
 * for (const [slug, slide] of talkTrack.slideContent) {
 *   console.log(`${slug}: ${slide.audioText.length} chars of audio`);
 * }
 * ```
 */
export function parseTalkTrack(content: string): TalkTrackV5 {
  // Step 1: Parse frontmatter
  const frontmatter = parseFrontmatter(content);

  // Step 2: Parse slides table
  const slides = parseSlidesTable(content, frontmatter.sections);

  // Step 3: Parse slide content
  const slideContent = parseSlideContent(content, slides);

  // Step 4: Parse branding
  const branding = parseBranding(frontmatter.branding);

  // Step 5: Construct final object
  const talkTrack: TalkTrackV5 = {
    version: 5,
    title: frontmatter.title,
    subtitle: frontmatter.subtitle,
    author: frontmatter.author,
    event: frontmatter.event,
    date: frontmatter.date,
    targetMinutes: frontmatter.target_minutes,
    audioVoice: frontmatter.audio_voice ?? 'af_heart',
    branding,
    showSpeakers: frontmatter.show_speakers,
    sections: frontmatter.sections,
    slides,
    slideContent,
  };

  return talkTrack;
}

/**
 * Safely parses a Talk Track v5 document, returning errors instead of throwing.
 *
 * @param content - The full markdown content
 * @returns Object with success flag, data, and errors
 */
export function safeParseTalkTrack(content: string): {
  success: boolean;
  data?: TalkTrackV5;
  errors?: string[];
} {
  try {
    const data = parseTalkTrack(content);
    return { success: true, data };
  } catch (e) {
    if (e instanceof TalkTrackParseError) {
      return {
        success: false,
        errors: e.errors.length > 0 ? e.errors : [e.message],
      };
    }
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, errors: [message] };
  }
}

/**
 * Extracts only the frontmatter from a Talk Track document.
 * Useful for quick metadata inspection without full parsing.
 */
export function extractFrontmatter(content: string): RawFrontmatter {
  return parseFrontmatter(content);
}

/**
 * Validates a Talk Track document without fully parsing it.
 * Returns a list of validation errors.
 */
export function validateTalkTrack(content: string): string[] {
  const result = safeParseTalkTrack(content);
  return result.errors ?? [];
}
