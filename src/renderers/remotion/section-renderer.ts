/**
 * Section-Based Video Renderer
 *
 * Splits a presentation timeline by section, renders each section
 * as an independent video clip, then stitches them with ffmpeg concat.
 *
 * Benefits over single-pass rendering:
 * - Faster: sections can render in parallel
 * - Resilient: if one section fails, only re-render that one
 * - Progress: granular progress per section
 *
 * Adapted from ai-talkshow-cli's AudioStitcher pattern.
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { existsSync, mkdirSync } from 'node:fs';
import { writeFile, unlink, stat } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { Timeline } from '../../generators/timeline/types.js';
import type { VideoQuality, VideoCodec } from './types.js';
import { QUALITY_PRESETS, CODEC_MAP } from './types.js';
import { VideoRenderError } from './renderer.js';

const execFileAsync = promisify(execFile);

/**
 * A section of the timeline with its frame range.
 */
export interface TimelineSection {
  /** Section name (e.g., "opening", "skills", "closing") */
  name: string;
  /** Index of first slide in this section */
  firstSlideIndex: number;
  /** Index of last slide in this section */
  lastSlideIndex: number;
  /** Number of slides in this section */
  slideCount: number;
  /** Start frame (inclusive) */
  startFrame: number;
  /** End frame (inclusive) */
  endFrame: number;
  /** Duration in seconds */
  durationSecs: number;
}

/**
 * Result from rendering a single section.
 */
export interface SectionRenderResult {
  /** Section name */
  section: string;
  /** Path to rendered video clip */
  outputPath: string;
  /** Duration in seconds */
  durationSecs: number;
  /** File size in bytes */
  sizeBytes: number;
}

/**
 * Options for section-based rendering.
 */
export interface SectionRenderOptions {
  /** Video quality preset */
  quality: VideoQuality;
  /** Video codec */
  codec: VideoCodec;
  /** Constant Rate Factor */
  crf: number;
  /** Output directory for section clips and final video */
  outputDir: string;
  /** Final output filename */
  outputFilename: string;
  /** Max concurrent section renders */
  concurrency: number;
  /** Progress callback: (overallProgress: 0-1, currentSection: string) */
  onProgress?: (progress: number, section: string) => void;
}

/**
 * Result from the full section-based render pipeline.
 */
export interface SectionPipelineResult {
  /** Path to final stitched video */
  outputPath: string;
  /** Total video duration in seconds */
  durationSecs: number;
  /** File size in bytes */
  sizeBytes: number;
  /** Individual section results */
  sections: SectionRenderResult[];
}

/**
 * Gets the Remotion entry point path.
 */
function getEntryPoint(): string {
  const possiblePaths = [
    join(dirname(import.meta.url.replace('file://', '')), 'Root.tsx'),
    join(process.cwd(), 'src', 'renderers', 'remotion', 'Root.tsx'),
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return p;
    }
  }

  throw new VideoRenderError(
    'Could not find Remotion entry point (Root.tsx).'
  );
}

/**
 * Split a timeline into sections based on slide section metadata.
 *
 * Preserves slide order from the timeline. Sections are returned
 * in the order they first appear.
 */
export function splitTimelineBySections(
  timeline: Timeline
): TimelineSection[] {
  const sections: TimelineSection[] = [];
  const sectionMap = new Map<string, number>(); // name -> index in sections[]

  for (let i = 0; i < timeline.slides.length; i++) {
    const slide = timeline.slides[i];
    const sectionName = slide.section;

    if (sectionMap.has(sectionName)) {
      // Extend existing section
      const idx = sectionMap.get(sectionName)!;
      const section = sections[idx];
      section.lastSlideIndex = i;
      section.slideCount++;
      section.endFrame = Math.ceil(slide.endTime * timeline.fps) - 1;
      section.durationSecs = slide.endTime - timeline.slides[section.firstSlideIndex].startTime;
    } else {
      // New section
      const startFrame = Math.floor(slide.startTime * timeline.fps);
      const endFrame = Math.ceil(slide.endTime * timeline.fps) - 1;

      sectionMap.set(sectionName, sections.length);
      sections.push({
        name: sectionName,
        firstSlideIndex: i,
        lastSlideIndex: i,
        slideCount: 1,
        startFrame,
        endFrame,
        durationSecs: slide.endTime - slide.startTime,
      });
    }
  }

  return sections;
}

/**
 * Render a presentation by sections: split, render each, stitch.
 *
 * Pipeline:
 * 1. Split timeline into sections
 * 2. Bundle Remotion project once
 * 3. Select composition once
 * 4. Render each section with frameRange
 * 5. Concat section clips with ffmpeg (-c copy, no re-encoding)
 * 6. Clean up intermediate files
 */
export async function renderBySections(
  timeline: Timeline,
  assetsPath: string,
  options: SectionRenderOptions
): Promise<SectionPipelineResult> {
  // Step 1: Split timeline into sections
  const sections = splitTimelineBySections(timeline);

  if (sections.length === 0) {
    throw new VideoRenderError('Timeline has no sections to render.');
  }

  options.onProgress?.(0, 'preparing');

  // Create sections output directory
  const sectionsDir = join(options.outputDir, 'sections');
  mkdirSync(sectionsDir, { recursive: true });

  // Step 2: Bundle Remotion project (once)
  options.onProgress?.(0.02, 'bundling');
  const entryPoint = getEntryPoint();

  const bundlePath = await bundle({
    entryPoint,
    publicDir: resolve(assetsPath),
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        extensionAlias: {
          '.js': ['.js', '.ts', '.tsx'],
        },
      },
    }),
  });

  options.onProgress?.(0.08, 'bundling');

  // Step 3: Select composition (once)
  const resolution = QUALITY_PRESETS[options.quality];
  const durationInFrames = Math.ceil(timeline.totalDuration * timeline.fps);

  const inputProps = {
    timeline: {
      ...timeline,
      slides: timeline.slides.map((slide) => ({
        ...slide,
        captions: slide.captions || [],
      })),
    },
    assetsPath: resolve(assetsPath),
  };

  const composition = await selectComposition({
    serveUrl: bundlePath,
    id: 'Presentation',
    inputProps,
  });

  const compositionWithSettings = {
    ...composition,
    width: resolution.width,
    height: resolution.height,
    fps: timeline.fps,
    durationInFrames,
  };

  options.onProgress?.(0.1, 'ready');

  // Step 4: Render each section
  const sectionResults: SectionRenderResult[] = [];
  const renderWeight = 0.85; // 85% of progress is rendering
  const renderStart = 0.1;

  // Calculate total frames for progress weighting
  const totalFrames = sections.reduce(
    (sum, s) => sum + (s.endFrame - s.startFrame + 1),
    0
  );

  // Render sections with concurrency control
  let framesRendered = 0;

  const renderSection = async (
    section: TimelineSection,
    index: number
  ): Promise<SectionRenderResult> => {
    const sectionFile = join(
      sectionsDir,
      `section-${String(index).padStart(2, '0')}-${section.name}.mp4`
    );

    const sectionFrames = section.endFrame - section.startFrame + 1;

    options.onProgress?.(
      renderStart + (framesRendered / totalFrames) * renderWeight,
      section.name
    );

    await renderMedia({
      composition: compositionWithSettings,
      serveUrl: bundlePath,
      outputLocation: sectionFile,
      codec: CODEC_MAP[options.codec] as any,
      crf: options.crf,
      inputProps,
      frameRange: [section.startFrame, section.endFrame],
      onProgress: ({ progress }) => {
        const sectionProgress = framesRendered + progress * sectionFrames;
        options.onProgress?.(
          renderStart + (sectionProgress / totalFrames) * renderWeight,
          section.name
        );
      },
    });

    framesRendered += sectionFrames;

    const stats = await stat(sectionFile);

    return {
      section: section.name,
      outputPath: sectionFile,
      durationSecs: section.durationSecs,
      sizeBytes: stats.size,
    };
  };

  // Process sections with concurrency limit
  if (options.concurrency <= 1) {
    // Sequential rendering
    for (let i = 0; i < sections.length; i++) {
      const result = await renderSection(sections[i], i);
      sectionResults.push(result);
    }
  } else {
    // Parallel rendering with concurrency limit
    const queue = sections.map((s, i) => ({ section: s, index: i }));
    const running: Promise<void>[] = [];

    // Pre-allocate results array
    const results = new Array<SectionRenderResult>(sections.length);

    for (const item of queue) {
      const promise = renderSection(item.section, item.index).then(
        (result) => {
          results[item.index] = result;
        }
      );
      running.push(promise);

      if (running.length >= options.concurrency) {
        await Promise.race(running);
        // Remove settled promises
        for (let i = running.length - 1; i >= 0; i--) {
          const settled = await Promise.race([
            running[i].then(() => true),
            Promise.resolve(false),
          ]);
          if (settled) {
            running.splice(i, 1);
          }
        }
      }
    }

    // Wait for remaining
    await Promise.all(running);
    sectionResults.push(...results);
  }

  options.onProgress?.(0.95, 'stitching');

  // Step 5: Concat section clips with ffmpeg
  const finalOutput = join(options.outputDir, options.outputFilename);
  const concatListPath = join(sectionsDir, 'concat-list.txt');

  const concatList = sectionResults
    .map((r) => `file '${resolve(r.outputPath)}'`)
    .join('\n');
  await writeFile(concatListPath, concatList, 'utf-8');

  await execFileAsync('ffmpeg', [
    '-f', 'concat',
    '-safe', '0',
    '-i', concatListPath,
    '-c', 'copy',
    '-y',
    finalOutput,
  ]);

  // Get final file size
  const finalStats = await stat(finalOutput);

  options.onProgress?.(0.98, 'cleanup');

  // Step 6: Clean up intermediate files
  await unlink(concatListPath);
  for (const result of sectionResults) {
    try {
      await unlink(result.outputPath);
    } catch {
      // Ignore cleanup errors
    }
  }

  // Remove sections directory if empty
  try {
    const { rmdir } = await import('node:fs/promises');
    await rmdir(sectionsDir);
  } catch {
    // Directory not empty or other error — skip
  }

  options.onProgress?.(1, 'done');

  return {
    outputPath: finalOutput,
    durationSecs: timeline.totalDuration,
    sizeBytes: finalStats.size,
    sections: sectionResults,
  };
}
