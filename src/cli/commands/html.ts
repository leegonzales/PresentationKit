/**
 * HTML Command
 *
 * Generate interactive HTML presentation from a talk track.
 * Supports both regular HTML (with external assets) and standalone
 * HTML (with all assets embedded as base64).
 */

import { Command } from 'commander';
import { resolve, dirname, join } from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';

import {
  ProgressSpinner,
  printHeader,
  printSuccess,
  printError,
  printStructuredError,
  printKeyValue,
  printSection,
  validateFile,
  formatDuration,
} from '../progress.js';

import { parseTalkTrack, TalkTrackParseError } from '../../parsers/talk-track.js';
import { renderHtmlPresentation, renderStandaloneHtml } from '../../renderers/html/index.js';
import type { Timeline } from '../../generators/timeline/types.js';

interface HtmlOptions {
  outputDir?: string;
  standalone?: boolean;
  mp3Bitrate?: string;
  verbose?: boolean;
}

/**
 * Register the html command with the program.
 */
export function registerHtmlCommand(program: Command): void {
  program
    .command('html')
    .description('Generate interactive HTML presentation')
    .argument('<talk-track>', 'Path to talk track markdown file')
    .option(
      '-d, --output-dir <dir>',
      'Output directory'
    )
    .option(
      '-s, --standalone',
      'Generate standalone HTML with embedded base64 assets'
    )
    .option(
      '--mp3-bitrate <bitrate>',
      'MP3 bitrate for standalone audio (default: 64k)',
      '64k'
    )
    .option('-v, --verbose', 'Enable verbose output')
    .action(htmlAction);
}

/**
 * HTML command action handler.
 */
async function htmlAction(
  talkTrackPath: string,
  options: HtmlOptions
): Promise<void> {
  const startTime = Date.now();
  const spinner = new ProgressSpinner({ verbose: options.verbose });

  printHeader('PresentationKit HTML Generation');

  try {
    // Validate talk track file
    const absolutePath = resolve(talkTrackPath);
    const sourceDir = dirname(absolutePath);
    await validateFile(absolutePath, 'Talk track file');

    // Determine output directory
    const outputDir = options.outputDir
      ? resolve(options.outputDir)
      : resolve(sourceDir, 'output');

    // Create output directory
    await mkdir(outputDir, { recursive: true });

    // Display configuration
    console.log('HTML Configuration:');
    printKeyValue('Source', absolutePath);
    printKeyValue('Source Directory', sourceDir);
    printKeyValue('Output Directory', outputDir);
    printKeyValue('Mode', options.standalone ? 'Standalone (embedded assets)' : 'Standard (external assets)');
    if (options.standalone) {
      printKeyValue('MP3 Bitrate', options.mp3Bitrate || '64k');
    }
    console.log();

    // Parse the talk track
    spinner.start('Parsing talk track...');
    const sourceContent = await readFile(absolutePath, 'utf-8');

    const talkTrack = parseTalkTrack(sourceContent);

    const slideCount = talkTrack.slides.length;
    spinner.succeed(`Parsed ${slideCount} slides`);

    // Check for timeline (generated audio) in output directory
    let timeline: Timeline | null = null;
    const timelinePath = join(outputDir, 'timeline.json');
    try {
      const timelineContent = await readFile(timelinePath, 'utf-8');
      timeline = JSON.parse(timelineContent);
      if (options.verbose) {
        console.log(`  Found existing timeline at ${timelinePath}`);
      }
    } catch {
      // No timeline found - that's okay for HTML-only generation
      if (options.verbose) {
        console.log('  No timeline found - generating HTML without audio');
      }
    }

    // Generate HTML based on mode
    let outputPath: string;
    let fileSizeMb: number | undefined;

    if (options.standalone) {
      // Standalone mode: embed all assets as base64
      // Check for FFmpeg if we have audio to embed
      if (timeline) {
        try {
          const { execa } = await import('execa');
          await execa('ffmpeg', ['-version']);
        } catch {
          spinner.fail('Prerequisite check failed');
          printError(
            'FFmpeg not found',
            'FFmpeg is required to embed audio in standalone HTML. Please install it and ensure it is in your PATH.'
          );
          process.exit(1);
        }
      }
      spinner.start('Generating standalone HTML (embedding assets)...');

      const result = await renderStandaloneHtml(
        talkTrack,
        timeline,
        join(outputDir, 'presentation-standalone.html'),
        sourceDir,
        {
          mp3Bitrate: options.mp3Bitrate || '64k',
          primaryColor: talkTrack.branding?.primary,
          onProgress: (message, progress) => {
            spinner.update(`${message}`);
          },
        }
      );

      outputPath = result.outputPath;
      fileSizeMb = result.fileSizeMb;
      spinner.succeed('Standalone HTML generation complete!');
    } else {
      // Standard mode: external assets
      spinner.start('Generating HTML presentation...');

      outputPath = join(outputDir, 'presentation.html');
      await renderHtmlPresentation(talkTrack, timeline, outputPath, {
        primaryColor: talkTrack.branding?.primary,
      });

      spinner.succeed('HTML generation complete!');
    }

    const elapsed = Date.now() - startTime;

    printSection('Results');
    printKeyValue('HTML Output', outputPath);
    printKeyValue('Slides', slideCount.toString());
    printKeyValue('Has Audio', timeline ? 'Yes' : 'No');
    if (fileSizeMb !== undefined) {
      printKeyValue('File Size', `${fileSizeMb.toFixed(1)} MB`);
    }
    printKeyValue('Duration', formatDuration(elapsed));

    console.log();
    console.log('Features included:');
    console.log('  - Keyboard navigation (arrows, space)');
    console.log('  - Touch/swipe support');
    console.log('  - Progress indicator');
    console.log('  - Section navigation');
    console.log('  - Fullscreen mode (F key)');
    console.log('  - Speaker notes (N key)');
    if (options.standalone) {
      console.log('  - Auto-advance mode (Y key)');
      console.log('  - All assets embedded (works offline)');
    }

    printSuccess(`HTML presentation generated at ${outputPath}`);
  } catch (error) {
    spinner.fail('HTML generation failed');

    // Handle specific error types with detailed messages
    if (error instanceof TalkTrackParseError) {
      printStructuredError(
        'Talk track validation failed:',
        error,
        'Please fix the above errors in your talk track file and try again.'
      );
    } else {
      const message = error instanceof Error ? error.message : String(error);
      printError(message);
    }

    if (options.verbose && error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}
