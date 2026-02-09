/**
 * Theme System
 *
 * Built-in theme presets for PresentationKit.
 * Themes control image file suffixes and CSS color presets.
 */

/**
 * Theme preset configuration.
 */
export interface ThemePreset {
  /** Theme display name */
  name: string;
  /** Image filename suffix (e.g., "-lego" maps slide-01.png to slide-01-lego.png) */
  imageSuffix: string;
  /** Primary brand color (hex) */
  primaryColor: string;
  /** Background color (hex) */
  backgroundColor: string;
  /** Text color (hex) */
  textColor: string;
}

/**
 * Built-in theme presets.
 */
export const BUILT_IN_THEMES: Record<string, ThemePreset> = {
  default: {
    name: 'Default',
    imageSuffix: '',
    primaryColor: '#557373',
    backgroundColor: '#0d0d0d',
    textColor: '#ffffff',
  },
  branded: {
    name: 'Branded',
    imageSuffix: '-branded',
    primaryColor: '#557373',
    backgroundColor: '#1e1e2e',
    textColor: '#f8fafc',
  },
  lego: {
    name: 'Lego',
    imageSuffix: '-lego',
    primaryColor: '#e3000b',
    backgroundColor: '#1a1a1a',
    textColor: '#ffffff',
  },
};

/**
 * Resolves a theme name to a ThemePreset.
 *
 * @param themeName - Theme name (case-insensitive)
 * @returns ThemePreset or undefined if not found
 */
export function resolveTheme(themeName: string): ThemePreset | undefined {
  return BUILT_IN_THEMES[themeName.toLowerCase()];
}

/**
 * Returns available theme names.
 */
export function getAvailableThemes(): string[] {
  return Object.keys(BUILT_IN_THEMES);
}

/**
 * Applies a theme suffix to an image filename.
 * Given "slide-01-title.png" and suffix "-lego",
 * returns "slide-01-title-lego.png".
 *
 * @param imagePath - Original image path
 * @param suffix - Theme suffix (e.g., "-lego")
 * @returns Modified image path with suffix before extension
 */
export function applyImageSuffix(imagePath: string, suffix: string): string {
  if (!suffix) return imagePath;

  const lastDot = imagePath.lastIndexOf('.');
  if (lastDot === -1) return imagePath + suffix;

  return imagePath.slice(0, lastDot) + suffix + imagePath.slice(lastDot);
}
