/**
 * Validation helpers for Talk Track v5 parsing.
 */

import type { Section } from './types.js';

/**
 * Valid slug pattern: lowercase letters, numbers, and hyphens.
 * Must start with a letter, not end with hyphen.
 */
const SLUG_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Valid hex color pattern: # followed by 3 or 6 hex digits.
 */
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Valid date pattern: YYYY-MM-DD.
 */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Valid slide position: integer or A-prefix with integer.
 */
const POSITION_PATTERN = /^(\d+|A\d+)$/;

/**
 * Validates a slug follows lowercase-kebab-case format.
 *
 * @param slug - The slug to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * validateSlug('my-slide') // true
 * validateSlug('slide1') // true
 * validateSlug('MySlide') // false
 * validateSlug('slide_name') // false
 */
export function validateSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') {
    return false;
  }
  return SLUG_PATTERN.test(slug);
}

/**
 * Validates a section ID exists in the sections array.
 *
 * @param sectionId - The section ID to validate
 * @param sections - Array of defined sections
 * @returns true if section exists, false otherwise
 */
export function validateSection(sectionId: string, sections: Section[]): boolean {
  if (!sectionId || typeof sectionId !== 'string') {
    return false;
  }
  if (!Array.isArray(sections)) {
    return false;
  }
  return sections.some((section) => section.id === sectionId);
}

/**
 * Validates an image path is reasonable (not checking existence).
 * Path should be a filename or relative path, not absolute.
 *
 * @param path - The image path to validate
 * @returns true if valid format, false otherwise
 */
export function validateImagePath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false;
  }
  // Should not be empty or just whitespace
  if (path.trim().length === 0) {
    return false;
  }
  // Should not be an absolute path
  if (path.startsWith('/') || /^[A-Z]:\\/.test(path)) {
    return false;
  }
  // Should have a reasonable image extension
  const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  const lowerPath = path.toLowerCase();
  return validExtensions.some((ext) => lowerPath.endsWith(ext));
}

/**
 * Validates a hex color code.
 *
 * @param color - The color to validate
 * @returns true if valid hex color, false otherwise
 */
export function validateHexColor(color: string): boolean {
  if (!color || typeof color !== 'string') {
    return false;
  }
  return HEX_COLOR_PATTERN.test(color);
}

/**
 * Validates a date string in YYYY-MM-DD format.
 *
 * @param date - The date string to validate
 * @returns true if valid format, false otherwise
 */
export function validateDate(date: string): boolean {
  if (!date || typeof date !== 'string') {
    return false;
  }
  if (!DATE_PATTERN.test(date)) {
    return false;
  }
  // Check if it's a valid date
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

/**
 * Validates a slide position (integer or A-prefix).
 *
 * @param position - The position to validate
 * @returns true if valid position format, false otherwise
 */
export function validatePosition(position: string): boolean {
  if (!position || typeof position !== 'string') {
    return false;
  }
  return POSITION_PATTERN.test(position);
}

/**
 * Validates that all slugs in an array are unique.
 *
 * @param slugs - Array of slugs to check
 * @returns Array of duplicate slugs (empty if all unique)
 */
export function findDuplicateSlugs(slugs: string[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const slug of slugs) {
    if (seen.has(slug)) {
      if (!duplicates.includes(slug)) {
        duplicates.push(slug);
      }
    } else {
      seen.add(slug);
    }
  }

  return duplicates;
}

/**
 * Comprehensive validation result.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a complete Section object.
 *
 * @param section - The section to validate
 * @returns Validation result with errors
 */
export function validateSectionObject(section: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!section || typeof section !== 'object') {
    return { valid: false, errors: ['Section must be an object'], warnings };
  }

  const s = section as Record<string, unknown>;

  if (!s.id || typeof s.id !== 'string') {
    errors.push('Section missing required "id" field');
  } else if (!validateSlug(s.id)) {
    errors.push(`Section id "${s.id}" is not valid lowercase-kebab-case`);
  }

  if (!s.name || typeof s.name !== 'string') {
    errors.push('Section missing required "name" field');
  }

  if (!s.color || typeof s.color !== 'string') {
    errors.push('Section missing required "color" field');
  } else if (!validateHexColor(s.color)) {
    errors.push(`Section color "${s.color}" is not a valid hex color`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
