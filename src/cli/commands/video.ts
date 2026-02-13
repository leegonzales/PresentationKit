/**
 * Video Command
 *
 * Render video from an existing build.
 * Requires audio to already be generated.
 *
 * Supports two modes:
 * - Single pass: renders entire presentation in one Remotion call
 * - Section split: renders each section independently, stitches with ffmpeg
 */

import { Command } from 'commander';
import { resolve, dirname, join } from 'node:path';
import { mkdir, stat, readFile } from 'node:fs/promises';

import type { VideoQuality } from '../../orchestrator/types.js';
import {
  renderVideoWithPreset,
  estimateRenderTime,
  renderBySections,
  splitTimelineBySections,
} from '../../renderers/remotion/index.js';
import type { Timeline } from '../../generators/timeline/types.js';
import {
  ProgressSpinner,
  printHeader,
  printSuccess,
  printError,
  printKeyValue,
  printSection,
  printWarning,
  validateFile,
  validateDirectory,
  formatDuration,
} from '../progress.js';

interface VideoOptions {
  quality: string;
  fps: string;
  outputDir?: string;
  split?: string;
  parallel?: string;
  verbose?: boolean;
}

/**
 * Register the video command with the program.
 */
export function registerVideoCommand(program: Command): void {
  program
    .command('video')
    .description('Render video from talk track (requires existing audio)')
    .argument('<talk-track>', 'Path to talk track markdown file')
    .option(
      '-q, --quality <quality>',
      'Video quality (720p, 1080p, or 4k)',
      '1080p'
    )
    .option(
      '--fps <fps>',
      'Frames per second',
      '30'
    )
    .option(
      '-d, --output-dir <dir>',
      'Output directory'
    )
    .option(
      '-s, --split <mode>',
      'Split rendering by sections (none or sections)',
      'sections'
    )
    .option(
      '-p, --parallel <n>',
      'Max concurrent section renders (with --split sections)',
      '1'
    )
    .option('-v, --verbose', 'Enable verbose output')
    .action(videoAction);
}

/**
 * Video command action handler.
 */
async function videoAction(
  talkTrackPath: string,
  options: VideoOptions
): Promise<void> {
  const startTime = Date.now();
  const spinner = new ProgressSpinner({ verbose: options.verbose });

  printHeader('PresentationKit Video Rendering');

  try {
    // Validate talk track file
    const absolutePath = resolve(talkTrackPath);
    await validateFile(absolutePath, 'Talk track file');

    // Validate options
    const quality = validateQuality(options.quality);
    const fps = validateFps(options.fps);
    const splitMode = validateSplitMode(options.split ?? 'sections');
    const parallel = validateParallel(options.parallel ?? '1');

    // Determine directories
    const outputDir = options.outputDir
      ? resolve(options.outputDir)
      : resolve(dirname(absolutePath), 'output');

    const audioDir = join(outputDir, 'audio');
    const timelinePath = join(outputDir, 'timeline.json');

    // Check for required audio files
    try {
      await validateDirectory(audioDir, 'Audio directory');
    } catch {
      printWarning(
        'Audio directory not found. Run `pk audio` or `pk build` first.'
      );
      throw new Error(
        `Audio not found at ${audioDir}. Generate audio first with: pk audio ${talkTrackPath}`
      );
    }

    // Check for timeline
    let hasTimeline = false;
    try {
      await stat(timelinePath);
      hasTimeline = true;
    } catch {
      // Timeline required
    }

    if (!hasTimeline) {
      throw new Error(
        `Timeline not found at ${timelinePath}. Run \`pk build\` first to generate timeline.json.`
      );
    }

    // Create output directory
    await mkdir(outputDir, { recursive: true });

    // Get resolution dimensions
    const resolution = getResolution(quality);

    // Load timeline
    const timelineData = JSON.parse(
      await readFile(timelinePath, 'utf-8')
    ) as Timeline;

    // Override timeline fps if user specified a different value
    if (fps !== timelineData.fps) {
      timelineData.fps = fps;
    }

    // Display configuration
    console.log('Video Configuration:');
    printKeyValue('Source', absolutePath);
    printKeyValue('Output Directory', outputDir);
    printKeyValue('Quality', quality);
    printKeyValue('Resolution', `${resolution.width}x${resolution.height}`);
    printKeyValue('FPS', fps.toString());
    printKeyValue('Render Mode', splitMode === 'sections' ? 'Section split' : 'Single pass');

    if (splitMode === 'sections') {
      const sections = splitTimelineBySections(timelineData);
      printKeyValue('Sections', `${sections.length}`);
      printKeyValue('Parallel', parallel.toString());

      if (options.verbose) {
        console.log('\nSection breakdown:');
        for (const section of sections) {
          printKeyValue(
            `  ${section.name}`,
            `${section.slideCount} slides, ${section.durationSecs.toFixed(1)}s`
          );
        }
      }
    }

    // Estimate render time
    const estimatedSecs = estimateRenderTime(timelineData, quality);
    printKeyValue(
      'Estimated Render Time',
      `~${Math.ceil(estimatedSecs / 60)} minutes`
    );
    console.log();

    // Start rendering
    spinner.start('Preparing video render...');

    const videoPath = join(outputDir, 'presentation.mp4');

    if (splitMode === 'sections') {
      // Section-based rendering
      const result = await renderBySections(
        timelineData,
        outputDir,
        {
          quality,
          codec: 'h264',
          crf: quality === '4k' ? 20 : quality === '720p' ? 25 : 23,
          outputDir,
          outputFilename: 'presentation.mp4',
          concurrency: parallel,
          onProgress: (progress: number, section: string) => {
            const percent = Math.round(progress * 100);
            if (progress < 0.08) {
              spinner.update('Bundling Remotion project...');
            } else if (progress < 0.1) {
              spinner.update('Preparing compositions...');
            } else if (progress < 0.95) {
              spinner.update(
                `Rendering [${section}] ${percent}%`
              );
            } else if (progress < 1) {
              spinner.update('Stitching sections with ffmpeg...');
            }
          },
        }
      );

      spinner.succeed('Video rendering complete!');

      const elapsed = Date.now() - startTime;
      const sizeMB = (result.sizeBytes / (1024 * 1024)).toFixed(1);

      printSection('Results');
      printKeyValue('Video Output', result.outputPath);
      printKeyValue('Video Duration', `${result.durationSecs.toFixed(1)}s`);
      printKeyValue('File Size', `${sizeMB} MB`);
      printKeyValue('Sections Rendered', `${result.sections.length}`);
      printKeyValue('Quality', quality);
      printKeyValue('FPS', fps.toString());
      printKeyValue('Render Time', formatDuration(elapsed));

      printSuccess(`Video rendered to ${result.outputPath}`);
    } else {
      // Single-pass rendering
      let lastPercent = 0;

      const result = await renderVideoWithPreset(
        timelineData,
        outputDir,
        videoPath,
        quality,
        (progress: number) => {
          const percent = Math.round(progress * 100);
          if (percent > lastPercent) {
            lastPercent = percent;
            if (progress < 0.1) {
              spinner.update('Bundling Remotion project...');
            } else if (progress < 0.15) {
              spinner.update('Selecting composition...');
            } else {
              spinner.update(
                `Rendering video... ${percent}%`
              );
            }
          }
        }
      );

      spinner.succeed('Video rendering complete!');

      const elapsed = Date.now() - startTime;

      printSection('Results');
      printKeyValue('Video Output', result.outputPath);
      printKeyValue('Video Duration', `${result.durationSecs.toFixed(1)}s`);
      printKeyValue('Quality', quality);
      printKeyValue('FPS', fps.toString());
      printKeyValue('Render Time', formatDuration(elapsed));

      printSuccess(`Video rendered to ${result.outputPath}`);
    }
  } catch (error) {
    spinner.fail('Video rendering failed');
    const message = error instanceof Error ? error.message : String(error);
    printError(message);

    if (options.verbose && error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

/**
 * Validate video quality option.
 */
function validateQuality(quality: string): VideoQuality {
  const validQualities: VideoQuality[] = ['720p', '1080p', '4k'];
  const normalized = quality.toLowerCase() as VideoQuality;

  if (!validQualities.includes(normalized)) {
    throw new Error(
      `Invalid quality: ${quality}. Valid qualities: ${validQualities.join(', ')}`
    );
  }

  return normalized;
}

/**
 * Validate FPS option.
 */
function validateFps(fps: string): number {
  const parsed = parseInt(fps, 10);

  if (isNaN(parsed) || parsed < 1 || parsed > 120) {
    throw new Error(
      `Invalid FPS: ${fps}. FPS must be a number between 1 and 120.`
    );
  }

  return parsed;
}

/**
 * Validate split mode option.
 */
function validateSplitMode(mode: string): 'none' | 'sections' {
  const valid = ['none', 'sections'];
  const normalized = mode.toLowerCase();

  if (!valid.includes(normalized)) {
    throw new Error(
      `Invalid split mode: ${mode}. Valid modes: ${valid.join(', ')}`
    );
  }

  return normalized as 'none' | 'sections';
}

/**
 * Validate parallel option.
 */
function validateParallel(value: string): number {
  const parsed = parseInt(value, 10);

  if (isNaN(parsed) || parsed < 1 || parsed > 8) {
    throw new Error(
      `Invalid parallel value: ${value}. Must be between 1 and 8.`
    );
  }

  return parsed;
}

/**
 * Get resolution dimensions for a quality preset.
 */
function getResolution(quality: VideoQuality): { width: number; height: number } {
  const resolutions: Record<VideoQuality, { width: number; height: number }> = {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '4k': { width: 3840, height: 2160 },
  };

  return resolutions[quality];
}
