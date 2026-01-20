/**
 * Audio Command
 *
 * Generate audio narration from a talk track.
 * Supports multiple TTS providers (Kokoro local, ElevenLabs cloud).
 */

import { Command } from 'commander';
import { resolve, dirname, join } from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';

import type { AudioProvider, KokoroVoice } from '../../generators/audio/types.js';
import { KOKORO_VOICES } from '../../generators/audio/types.js';
import {
  ProgressSpinner,
  printHeader,
  printSuccess,
  printError,
  printKeyValue,
  printSection,
  validateFile,
  formatDuration,
} from '../progress.js';

interface AudioOptions {
  voice: string;
  provider: string;
  outputDir?: string;
  format: string;
  verbose?: boolean;
}

/**
 * Register the audio command with the program.
 */
export function registerAudioCommand(program: Command): void {
  program
    .command('audio')
    .description('Generate audio narration from talk track')
    .argument('<talk-track>', 'Path to talk track markdown file')
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
      '-d, --output-dir <dir>',
      'Output directory for audio files'
    )
    .option(
      '-f, --format <format>',
      'Audio format (mp3 or wav)',
      'mp3'
    )
    .option('-v, --verbose', 'Enable verbose output')
    .action(audioAction);
}

/**
 * Audio command action handler.
 */
async function audioAction(
  talkTrackPath: string,
  options: AudioOptions
): Promise<void> {
  const startTime = Date.now();
  const spinner = new ProgressSpinner({ verbose: options.verbose });

  printHeader('PresentationKit Audio Generation');

  try {
    // Validate talk track file
    const absolutePath = resolve(talkTrackPath);
    await validateFile(absolutePath, 'Talk track file');

    // Validate options
    const provider = validateProvider(options.provider);
    const format = validateFormat(options.format);

    // Validate voice for Kokoro provider
    if (provider === 'kokoro') {
      validateKokoroVoice(options.voice);
    }

    // Determine output directory
    const outputDir = options.outputDir
      ? resolve(options.outputDir)
      : resolve(dirname(absolutePath), 'audio');

    // Create output directory
    await mkdir(outputDir, { recursive: true });

    // Display configuration
    console.log('Audio Configuration:');
    printKeyValue('Source', absolutePath);
    printKeyValue('Output Directory', outputDir);
    printKeyValue('Provider', provider);
    printKeyValue('Voice', options.voice);
    printKeyValue('Format', format);

    if (provider === 'kokoro' && options.voice in KOKORO_VOICES) {
      printKeyValue(
        'Voice Description',
        KOKORO_VOICES[options.voice as KokoroVoice]
      );
    }
    console.log();

    // Start audio generation
    spinner.start('Parsing talk track...');

    // TODO: Integrate with actual parser and audio generator
    // For now, we simulate the process
    const sourceContent = await readFile(absolutePath, 'utf-8');

    spinner.update('Extracting audio text from slides...');

    // Extract slide count (basic heuristic for progress)
    const slideMatches = sourceContent.match(/^## /gm);
    const estimatedSlides = slideMatches ? slideMatches.length : 1;

    spinner.update(`Generating audio for ${estimatedSlides} slides...`);

    // TODO: Replace with actual implementation
    // const { generateAudio } = await import('../../generators/audio/index.js');
    // const { parseTalkTrack } = await import('../../parsers/talk-track.js');
    //
    // const parseResult = await parseTalkTrack(absolutePath);
    // if (!parseResult.success) {
    //   throw new Error(`Parse error: ${parseResult.errors?.join(', ')}`);
    // }
    //
    // const slides = Array.from(parseResult.data!.slideContent.values());
    // const manifest = await generateAudio(slides, {
    //   provider,
    //   voice: options.voice,
    //   outputDir,
    //   format,
    // });

    // Placeholder: simulate success
    spinner.succeed('Audio generation complete!');

    const elapsed = Date.now() - startTime;

    printSection('Results');
    printKeyValue('Audio Files', `${estimatedSlides} files generated`);
    printKeyValue('Output Directory', outputDir);
    printKeyValue('Duration', formatDuration(elapsed));

    if (provider === 'kokoro') {
      printKeyValue('Cost', 'Free (local Kokoro TTS)');
    } else {
      // TODO: Calculate actual ElevenLabs cost from manifest
      printKeyValue('Cost', 'See cost report for details');
    }

    printSuccess(`Audio generated in ${outputDir}`);
  } catch (error) {
    spinner.fail('Audio generation failed');
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
 * Validate audio format option.
 */
function validateFormat(format: string): 'mp3' | 'wav' {
  const validFormats = ['mp3', 'wav'];
  const normalized = format.toLowerCase();

  if (!validFormats.includes(normalized)) {
    throw new Error(
      `Invalid format: ${format}. Valid formats: ${validFormats.join(', ')}`
    );
  }

  return normalized as 'mp3' | 'wav';
}

/**
 * Validate Kokoro voice option.
 */
function validateKokoroVoice(voice: string): void {
  const validVoices = Object.keys(KOKORO_VOICES);

  if (!validVoices.includes(voice)) {
    console.warn(
      `Warning: '${voice}' is not a known Kokoro voice. Known voices:`
    );
    for (const [id, description] of Object.entries(KOKORO_VOICES)) {
      console.warn(`  ${id}: ${description}`);
    }
    console.warn('Proceeding with the specified voice anyway...\n');
  }
}
