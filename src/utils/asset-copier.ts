/**
 * Asset Copier
 *
 * Copies presentation assets (images) from source directories to the output
 * directory, resolving relative paths from the talk track location.
 */

import { copyFile, mkdir, access, readdir, stat } from 'node:fs/promises';
import { join, dirname, basename, resolve, isAbsolute, extname } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * Result of copying assets.
 */
export interface AssetCopyResult {
  /** Number of images copied */
  imagesCopied: number;
  /** Mapping from original paths to new paths in output directory */
  pathMapping: Map<string, string>;
  /** Any errors encountered (non-fatal) */
  warnings: string[];
}

/**
 * Options for asset copying.
 */
export interface AssetCopyOptions {
  /** Whether to overwrite existing files (default: true) */
  overwrite?: boolean;
}

/**
 * Checks if a file exists.
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves an image path relative to the source directory.
 *
 * Handles various path formats:
 * - Relative paths: "images/slide.png" -> sourceDir/images/slide.png
 * - Absolute paths: "/Users/.../slide.png" -> as-is
 * - Paths with ./ prefix: "./images/slide.png" -> sourceDir/images/slide.png
 */
export function resolveImagePath(imagePath: string, sourceDir: string): string {
  if (isAbsolute(imagePath)) {
    return imagePath;
  }

  // Remove ./ prefix if present
  const cleanPath = imagePath.startsWith('./') ? imagePath.slice(2) : imagePath;

  return resolve(sourceDir, cleanPath);
}

/**
 * Copies images from source locations to the output directory.
 *
 * @param imagePaths - Array of image paths (may be relative or absolute)
 * @param sourceDir - Directory containing the talk track (used to resolve relative paths)
 * @param outputDir - Destination directory (images go to outputDir/images/)
 * @param options - Copy options
 * @returns Result containing mapping of old paths to new paths
 *
 * @example
 * ```typescript
 * const result = await copyAssets(
 *   ['images/slide-01.png', 'images/slide-02.png'],
 *   '/path/to/talk-track-dir',
 *   '/path/to/output'
 * );
 *
 * // result.pathMapping: Map {
 * //   'images/slide-01.png' => 'images/slide-01.png',
 * //   'images/slide-02.png' => 'images/slide-02.png',
 * // }
 * ```
 */
export async function copyAssets(
  imagePaths: string[],
  sourceDir: string,
  outputDir: string,
  options: AssetCopyOptions = {}
): Promise<AssetCopyResult> {
  const { overwrite = true } = options;

  const imagesOutputDir = join(outputDir, 'images');
  await mkdir(imagesOutputDir, { recursive: true });

  const pathMapping = new Map<string, string>();
  const warnings: string[] = [];
  let imagesCopied = 0;

  // Process unique paths only
  const uniquePaths = [...new Set(imagePaths)];

  for (const imagePath of uniquePaths) {
    if (!imagePath) {
      continue;
    }

    try {
      // Resolve the source file location
      const sourcePath = resolveImagePath(imagePath, sourceDir);

      // Check if source exists
      if (!(await fileExists(sourcePath))) {
        warnings.push(`Image not found: ${sourcePath}`);
        continue;
      }

      // Generate unique filename using hash of original path to prevent collisions
      // e.g., section-1/diagram.png and section-2/diagram.png get unique names
      const ext = extname(sourcePath);
      const originalFilename = basename(sourcePath, ext);
      const pathHash = createHash('md5').update(imagePath).digest('hex').slice(0, 8);
      const uniqueFilename = `${originalFilename}-${pathHash}${ext}`;
      const destPath = join(imagesOutputDir, uniqueFilename);
      const relativePath = `images/${uniqueFilename}`;

      // Check if destination exists
      const destExists = await fileExists(destPath);
      if (destExists && !overwrite) {
        // Use existing file, still add to mapping
        pathMapping.set(imagePath, relativePath);
        continue;
      }

      // Copy the file
      await copyFile(sourcePath, destPath);
      pathMapping.set(imagePath, relativePath);
      imagesCopied++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Failed to copy ${imagePath}: ${message}`);
    }
  }

  return {
    imagesCopied,
    pathMapping,
    warnings,
  };
}

/**
 * Copies all image files from a directory (non-recursive).
 *
 * Useful for copying an entire images folder.
 *
 * @param sourceImagesDir - Source images directory
 * @param outputDir - Destination output directory
 * @returns Result of the copy operation
 */
export async function copyImagesDirectory(
  sourceImagesDir: string,
  outputDir: string
): Promise<AssetCopyResult> {
  const warnings: string[] = [];

  // Check if source directory exists
  if (!(await fileExists(sourceImagesDir))) {
    return {
      imagesCopied: 0,
      pathMapping: new Map(),
      warnings: [`Source directory not found: ${sourceImagesDir}`],
    };
  }

  // List files in the directory
  const entries = await readdir(sourceImagesDir);
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

  const imagePaths: string[] = [];

  for (const entry of entries) {
    const ext = entry.toLowerCase().slice(entry.lastIndexOf('.'));
    if (imageExtensions.includes(ext)) {
      imagePaths.push(join(sourceImagesDir, entry));
    }
  }

  // Use copyAssets with the source directory being the images directory
  return copyAssets(
    imagePaths.map((p) => basename(p)),
    sourceImagesDir,
    outputDir
  );
}

/**
 * Updates image paths in a timeline to use the new relative paths.
 *
 * @param slides - Timeline slides with original image paths
 * @param pathMapping - Mapping from original to new paths
 * @returns Updated slides with new paths
 */
export function updateTimelinePaths<T extends { imagePath: string }>(
  slides: T[],
  pathMapping: Map<string, string>
): T[] {
  return slides.map((slide) => {
    const newPath = pathMapping.get(slide.imagePath);
    if (newPath) {
      return { ...slide, imagePath: newPath };
    }
    return slide;
  });
}
