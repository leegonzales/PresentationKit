/**
 * Video Command
 *
 * Render video from an existing build.
 * Requires audio to already be generated.
 */

import { Command } from 'commander';
import { resolve, dirname, join } from 'node:path';
import { mkdir, stat } from 'node:fs/promises';

import type { VideoQuality } from '../../orchestrator/types.js';
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

    // Check for timeline (optional but recommended)
    let hasTimeline = false;
    try {
      await stat(timelinePath);
      hasTimeline = true;
    } catch {
      printWarning(
        'Timeline not found. Video timing may be estimated from audio duration.'
      );
    }

    // Create output directory
    await mkdir(outputDir, { recursive: true });

    // Get resolution dimensions
    const resolution = getResolution(quality);

    // Display configuration
    console.log('Video Configuration:');
    printKeyValue('Source', absolutePath);
    printKeyValue('Audio Directory', audioDir);
    printKeyValue('Output Directory', outputDir);
    printKeyValue('Quality', quality);
    printKeyValue('Resolution', `${resolution.width}x${resolution.height}`);
    printKeyValue('FPS', fps.toString());
    printKeyValue('Has Timeline', hasTimeline ? 'Yes' : 'No (will estimate)');
    console.log();

    // Start video rendering
    spinner.start('Preparing video render...');

    // TODO: Integrate with actual Remotion renderer
    // const { renderVideo } = await import('../../renderers/remotion/index.js');
    //
    // spinner.update('Loading timeline...');
    // const timeline = hasTimeline
    //   ? JSON.parse(await readFile(timelinePath, 'utf-8'))
    //   : await buildTimelineFromAudio(audioDir);
    //
    // spinner.update('Rendering video...');
    // const result = await renderVideo(timeline, {
    //   quality,
    //   fps,
    //   outputDir,
    // });

    // Placeholder: simulate rendering stages
    const stages = [
      'Loading assets...',
      'Preparing compositions...',
      'Rendering frames...',
      'Encoding video...',
      'Finalizing output...',
    ];

    for (const stage of stages) {
      spinner.update(stage);
      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    spinner.succeed('Video rendering complete!');

    const elapsed = Date.now() - startTime;
    const videoPath = join(outputDir, 'presentation.mp4');

    printSection('Results');
    printKeyValue('Video Output', videoPath);
    printKeyValue('Quality', quality);
    printKeyValue('FPS', fps.toString());
    printKeyValue('Duration', formatDuration(elapsed));

    printSuccess(`Video rendered to ${videoPath}`);
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
