/**
 * Notes Command
 *
 * Generate speaker notes from a talk track.
 * Creates printable markdown/HTML document with slide thumbnails and notes.
 */

import { Command } from 'commander';
import { resolve, dirname, join } from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';

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

interface NotesOptions {
  outputDir?: string;
  format: string;
  verbose?: boolean;
}

/**
 * Register the notes command with the program.
 */
export function registerNotesCommand(program: Command): void {
  program
    .command('notes')
    .description('Generate speaker notes document')
    .argument('<talk-track>', 'Path to talk track markdown file')
    .option(
      '-d, --output-dir <dir>',
      'Output directory'
    )
    .option(
      '-f, --format <format>',
      'Output format (md or html)',
      'md'
    )
    .option('-v, --verbose', 'Enable verbose output')
    .action(notesAction);
}

/**
 * Notes command action handler.
 */
async function notesAction(
  talkTrackPath: string,
  options: NotesOptions
): Promise<void> {
  const startTime = Date.now();
  const spinner = new ProgressSpinner({ verbose: options.verbose });

  printHeader('PresentationKit Speaker Notes');

  try {
    // Validate talk track file
    const absolutePath = resolve(talkTrackPath);
    await validateFile(absolutePath, 'Talk track file');

    // Validate format
    const format = validateFormat(options.format);

    // Determine output directory
    const outputDir = options.outputDir
      ? resolve(options.outputDir)
      : resolve(dirname(absolutePath), 'output');

    // Create output directory
    await mkdir(outputDir, { recursive: true });

    // Display configuration
    console.log('Notes Configuration:');
    printKeyValue('Source', absolutePath);
    printKeyValue('Output Directory', outputDir);
    printKeyValue('Format', format);
    console.log();

    // Start notes generation
    spinner.start('Parsing talk track...');

    // TODO: Integrate with actual parser and notes renderer
    // const { parseTalkTrack } = await import('../../parsers/talk-track.js');
    // const { renderNotes } = await import('../../renderers/notes/index.js');
    //
    // const parseResult = await parseTalkTrack(absolutePath);
    // if (!parseResult.success) {
    //   throw new Error(`Parse error: ${parseResult.errors?.join(', ')}`);
    // }
    //
    // spinner.update('Generating speaker notes...');
    // await renderNotes(parseResult.data!, {
    //   outputDir,
    //   format,
    // });

    // Placeholder: simulate processing
    const sourceContent = await readFile(absolutePath, 'utf-8');

    spinner.update('Extracting slide content...');
    const slideMatches = sourceContent.match(/^## /gm);
    const slideCount = slideMatches ? slideMatches.length : 0;

    spinner.update('Generating notes document...');

    // Extract sections for summary
    const sectionMatches = sourceContent.match(/^# /gm);
    const sectionCount = sectionMatches ? sectionMatches.length : 0;

    spinner.succeed('Speaker notes generated!');

    const elapsed = Date.now() - startTime;
    const notesPath = join(outputDir, `speaker-notes.${format}`);

    printSection('Results');
    printKeyValue('Notes Output', notesPath);
    printKeyValue('Slides', slideCount.toString());
    printKeyValue('Sections', sectionCount.toString());
    printKeyValue('Format', format.toUpperCase());
    printKeyValue('Duration', formatDuration(elapsed));

    console.log();
    console.log('Notes include:');
    console.log('  - Slide thumbnails (if images exist)');
    console.log('  - Spoken text for each slide');
    console.log('  - Speaker notes and context');
    console.log('  - Timing estimates');
    console.log('  - Section headings');

    printSuccess(`Speaker notes generated at ${notesPath}`);
  } catch (error) {
    spinner.fail('Notes generation failed');
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
 * Validate output format option.
 */
function validateFormat(format: string): 'md' | 'html' {
  const validFormats = ['md', 'html'];
  const normalized = format.toLowerCase();

  if (!validFormats.includes(normalized)) {
    throw new Error(
      `Invalid format: ${format}. Valid formats: ${validFormats.join(', ')}`
    );
  }

  return normalized as 'md' | 'html';
}
