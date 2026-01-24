/**
 * Audio Command
 *
 * Generate audio narration from a talk track.
 * Supports multiple TTS providers (Kokoro local, ElevenLabs cloud).
 */

import { Command } from 'commander';
import { resolve, dirname } from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';

import type { AudioProvider, KokoroVoice, VoiceConfig } from '../../generators/audio/types.js';
import { KOKORO_VOICES, DEFAULT_MULTI_VOICES } from '../../generators/audio/types.js';
import { generateKokoroAudio, generateMultiVoiceKokoroAudio } from '../../generators/audio/kokoro.js';
import { parseTalkTrack } from '../../parsers/talk-track.js';
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
  voices?: string;
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
      '--voices <voices>',
      'Multi-voice config: name1:voice_id1,name2:voice_id2 (e.g., George:bm_george,Emma:bf_emma)'
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
 * Parse multi-voice configuration string.
 * Format: name1:voice_id1,name2:voice_id2
 */
function parseVoicesOption(voicesStr: string): VoiceConfig[] {
  const voices: VoiceConfig[] = [];
  const pairs = voicesStr.split(',');

  for (const pair of pairs) {
    const [name, voiceId] = pair.split(':').map((s) => s.trim());
    if (name && voiceId) {
      voices.push({ name, voiceId });
    } else {
      throw new Error(
        `Invalid voice config: '${pair}'. Expected format: name:voice_id`
      );
    }
  }

  if (voices.length === 0) {
    throw new Error('No valid voice configurations found');
  }

  return voices;
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

    // Parse multi-voice configuration
    const voices = options.voices
      ? parseVoicesOption(options.voices)
      : null;
    const isMultiVoice = voices !== null && voices.length > 0;

    // Validate voice(s) for Kokoro provider
    if (provider === 'kokoro') {
      if (isMultiVoice) {
        for (const v of voices) {
          validateKokoroVoice(v.voiceId);
        }
      } else {
        validateKokoroVoice(options.voice);
      }
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

    if (isMultiVoice) {
      printKeyValue('Mode', 'Multi-voice');
      for (const v of voices) {
        printKeyValue(`  ${v.name}`, v.voiceId);
      }
    } else {
      printKeyValue('Voice', options.voice);
      if (options.voice in KOKORO_VOICES) {
        printKeyValue(
          'Voice Description',
          KOKORO_VOICES[options.voice as KokoroVoice]
        );
      }
    }
    printKeyValue('Format', format);
    console.log();

    // Parse talk track
    spinner.start('Parsing talk track...');
    const sourceContent = await readFile(absolutePath, 'utf-8');
    const talkTrack = parseTalkTrack(sourceContent);
    const slides = Array.from(talkTrack.slideContent.values());

    spinner.update('Extracting audio text from slides...');

    // Generate audio
    if (provider === 'kokoro') {
      if (isMultiVoice) {
        spinner.update(`Generating audio for ${slides.length} slides (${voices.length} voices)...`);

        const manifest = await generateMultiVoiceKokoroAudio(slides, {
          outputDir,
          voices,
          onProgress: (voiceName, slideSlug, progress) => {
            spinner.update(
              `[${voiceName}] Generating: ${slideSlug} (${Math.round(progress * 100)}%)`
            );
          },
        });

        spinner.succeed('Audio generation complete!');

        const elapsed = Date.now() - startTime;

        printSection('Results');
        for (const [voiceName, voiceManifest] of Object.entries(manifest.voiceManifests)) {
          printKeyValue(
            `${voiceName.charAt(0).toUpperCase() + voiceName.slice(1)} Audio`,
            `${voiceManifest.slides.length} files, ${Math.round(voiceManifest.totalDurationSecs)}s`
          );
        }
        printKeyValue('Total Characters', manifest.totalCharacters.toLocaleString());
        printKeyValue('Output Directory', outputDir);
        printKeyValue('Duration', formatDuration(elapsed));
        printKeyValue('Cost', 'Free (local Kokoro TTS)');
      } else {
        spinner.update(`Generating audio for ${slides.length} slides...`);

        const manifest = await generateKokoroAudio(slides, {
          outputDir,
          voice: options.voice,
          onProgress: (slideSlug, progress) => {
            spinner.update(`Generating: ${slideSlug} (${Math.round(progress * 100)}%)`);
          },
        });

        spinner.succeed('Audio generation complete!');

        const elapsed = Date.now() - startTime;

        printSection('Results');
        printKeyValue('Audio Files', `${manifest.slides.length} files`);
        printKeyValue('Total Duration', `${Math.round(manifest.totalDurationSecs)}s`);
        printKeyValue('Total Characters', manifest.totalCharacters.toLocaleString());
        printKeyValue('Output Directory', outputDir);
        printKeyValue('Duration', formatDuration(elapsed));
        printKeyValue('Cost', 'Free (local Kokoro TTS)');
      }
    } else {
      // ElevenLabs support is TODO
      throw new Error('ElevenLabs provider not yet implemented for CLI');
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
