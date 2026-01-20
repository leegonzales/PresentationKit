/**
 * Build Command
 *
 * Full presentation build pipeline.
 * Parses talk track, generates audio, builds timeline, and renders outputs.
 */

import { Command } from 'commander';
import { resolve, dirname, basename } from 'node:path';
import { mkdir } from 'node:fs/promises';

import { buildPresentation } from '../../orchestrator/index.js';
import type { OutputFormat, VideoQuality } from '../../orchestrator/types.js';
import type { AudioProvider } from '../../generators/audio/types.js';
import {
  ProgressSpinner,
  printHeader,
  printSuccess,
  printError,
  printKeyValue,
  validateFile,
  parseOutputFormats,
  createProgressCallback,
  formatDuration,
} from '../progress.js';

interface BuildOptions {
  output: string;
  voice: string;
  provider: string;
  quality: string;
  outputDir?: string;
  verbose?: boolean;
}

/**
 * Register the build command with the program.
 */
export function registerBuildCommand(program: Command): void {
  program
    .command('build')
    .description('Build presentation from talk track')
    .argument('<talk-track>', 'Path to talk track markdown file')
    .option(
      '-o, --output <formats>',
      'Output formats (comma-separated: html,video,notes)',
      'html,video,notes'
    )
    .option(
      '--voice <voice>',
      'Voice ID for TTS (e.g., af_heart, af_bella)',
      'af_heart'
    )
    .option(
      '-p, --provider <provider>',
      'TTS provider (kokoro or elevenlabs)',
      'kokoro'
    )
    .option(
      '-q, --quality <quality>',
      'Video quality (720p, 1080p, or 4k)',
      '1080p'
    )
    .option(
      '-d, --output-dir <dir>',
      'Output directory (default: ./output)'
    )
    .option('-v, --verbose', 'Enable verbose output')
    .action(buildAction);
}

/**
 * Build command action handler.
 */
async function buildAction(
  talkTrackPath: string,
  options: BuildOptions
): Promise<void> {
  const startTime = Date.now();
  const spinner = new ProgressSpinner({ verbose: options.verbose });

  printHeader('PresentationKit Build');

  try {
    // Validate talk track file
    const absolutePath = resolve(talkTrackPath);
    await validateFile(absolutePath, 'Talk track file');

    // Parse and validate options
    const outputs = parseOutputFormats(options.output);
    const provider = validateProvider(options.provider);
    const quality = validateQuality(options.quality);

    // Determine output directory
    const outputDir = options.outputDir
      ? resolve(options.outputDir)
      : resolve(dirname(absolutePath), 'output');

    // Create output directory
    await mkdir(outputDir, { recursive: true });

    // Display build configuration
    console.log('Build Configuration:');
    printKeyValue('Source', absolutePath);
    printKeyValue('Output Directory', outputDir);
    printKeyValue('Outputs', outputs.join(', '));
    printKeyValue('Voice', options.voice);
    printKeyValue('Provider', provider);
    if (outputs.includes('video')) {
      printKeyValue('Video Quality', quality);
    }
    console.log();

    // Start build
    spinner.start('Starting build...');

    const manifest = await buildPresentation(absolutePath, {
      outputs,
      audioProvider: provider,
      voice: options.voice,
      videoQuality: quality,
      outputDir,
      onProgress: createProgressCallback(spinner),
    });

    // Build complete
    spinner.succeed('Build complete!');

    // Display results
    const elapsed = Date.now() - startTime;
    console.log();
    console.log('Generated Outputs:');

    if (manifest.outputs.html) {
      printKeyValue('HTML', manifest.outputs.html);
    }
    if (manifest.outputs.video) {
      printKeyValue('Video', manifest.outputs.video);
    }
    if (manifest.outputs.notes) {
      printKeyValue('Notes', manifest.outputs.notes);
    }
    if (manifest.outputs.timeline) {
      printKeyValue('Timeline', manifest.outputs.timeline);
    }

    console.log();
    printKeyValue('Build ID', manifest.id);
    printKeyValue('Duration', formatDuration(elapsed));

    // Show cost summary if any costs were tracked
    if (manifest.costs.length > 0) {
      const totalCost = manifest.costs.reduce(
        (sum, c) => sum + (c.estimatedCostUsd ?? 0),
        0
      );
      printKeyValue('Estimated Cost', `$${totalCost.toFixed(4)}`);
    }

    printSuccess(`Presentation built successfully in ${outputDir}`);
  } catch (error) {
    spinner.fail('Build failed');
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
 * Validate TTS provider option.
 */
function validateProvider(provider: string): AudioProvider {
  const validProviders: AudioProvider[] = ['kokoro', 'elevenlabs'];
  const normalized = provider.toLowerCase() as AudioProvider;

  if (!validProviders.includes(normalized)) {
    throw new Error(
      `Invalid provider: ${provider}. Valid providers: ${validProviders.join(', ')}`
    );
  }

  return normalized;
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
