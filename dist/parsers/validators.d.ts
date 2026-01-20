/**
 * Validation helpers for Talk Track v5 parsing.
 */
import type { Section } from './types.js';
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
export declare function validateSlug(slug: string): boolean;
/**
 * Validates a section ID exists in the sections array.
 *
 * @param sectionId - The section ID to validate
 * @param sections - Array of defined sections
 * @returns true if section exists, false otherwise
 */
export declare function validateSection(sectionId: string, sections: Section[]): boolean;
/**
 * Validates an image path is reasonable (not checking existence).
 * Path should be a filename or relative path, not absolute.
 *
 * @param path - The image path to validate
 * @returns true if valid format, false otherwise
 */
export declare function validateImagePath(path: string): boolean;
/**
 * Validates a hex color code.
 *
 * @param color - The color to validate
 * @returns true if valid hex color, false otherwise
 */
export declare function validateHexColor(color: string): boolean;
/**
 * Validates a date string in YYYY-MM-DD format.
 *
 * @param date - The date string to validate
 * @returns true if valid format, false otherwise
 */
export declare function validateDate(date: string): boolean;
/**
 * Validates a slide position (integer or A-prefix).
 *
 * @param position - The position to validate
 * @returns true if valid position format, false otherwise
 */
export declare function validatePosition(position: string): boolean;
/**
 * Validates that all slugs in an array are unique.
 *
 * @param slugs - Array of slugs to check
 * @returns Array of duplicate slugs (empty if all unique)
 */
export declare function findDuplicateSlugs(slugs: string[]): string[];
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
export declare function validateSectionObject(section: unknown): ValidationResult;
//# sourceMappingURL=validators.d.ts.map