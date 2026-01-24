/**
 * Shared utility functions for HTML renderers.
 *
 * These utilities are used by both the standard and standalone HTML renderers
 * to ensure consistent behavior.
 */

import type { Section } from '../../parsers/types.js';

/**
 * Strips semantic tags from audio text for clean display.
 *
 * Removes tags like [HOOK], [KEY_POINT], [PAUSE:2], etc. and normalizes whitespace.
 *
 * @param audioText - Text that may contain semantic tags
 * @returns Clean text with tags removed and whitespace normalized
 */
export function stripSemanticTags(audioText: string): string {
  return audioText
    .replace(
      /\[(HOOK|KEY_POINT|EVIDENCE|STORY|TRANSITION|CALLBACK|LANDING|CTA|PAUSE)(?::\d+)?\]/gi,
      '',
    )
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Gets section color from the TalkTrack sections array.
 *
 * @param sectionId - The section ID to look up
 * @param sections - Array of Section definitions
 * @param defaultColor - Fallback color if section not found
 * @returns Hex color string
 */
export function getSectionColor(
  sectionId: string,
  sections: Section[],
  defaultColor: string,
): string {
  const section = sections.find(
    (s) => s.id.toLowerCase() === sectionId.toLowerCase(),
  );
  return section?.color ?? defaultColor;
}

/**
 * Gets section name from the TalkTrack sections array.
 *
 * If the section is not found, converts the sectionId to title case
 * (e.g., "key-concepts" -> "Key Concepts").
 *
 * @param sectionId - The section ID to look up
 * @param sections - Array of Section definitions
 * @returns Section name or title-cased ID as fallback
 */
export function getSectionName(sectionId: string, sections: Section[]): string {
  const section = sections.find(
    (s) => s.id.toLowerCase() === sectionId.toLowerCase(),
  );
  return section?.name ?? sectionId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Formats a date string or Date object for display.
 *
 * @param date - ISO date string (YYYY-MM-DD) or undefined
 * @returns Formatted date string (e.g., "January 19, 2026")
 */
export function formatDate(date?: string): string {
  if (!date) {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  try {
    const parsed = new Date(date + 'T00:00:00');
    return parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return date;
  }
}

/**
 * Escapes HTML special characters for safe rendering.
 *
 * @param text - Text that may contain HTML special characters
 * @returns Text with HTML special characters escaped
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escapes a string for safe use in JavaScript template literals.
 * Also escapes '<' to prevent </script> injection (XSS prevention).
 *
 * @param text - Text to escape for JavaScript
 * @returns Text safe for use in JavaScript strings
 */
export function escapeJs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/</g, '\\u003C');
}
