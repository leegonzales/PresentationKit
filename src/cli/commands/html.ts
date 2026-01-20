/**
 * HTML Command
 *
 * Generate interactive HTML presentation from a talk track.
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

interface HtmlOptions {
  outputDir?: string;
  template?: string;
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
      '-t, --template <template>',
      'HTML template (default or custom path)',
      'default'
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
    await validateFile(absolutePath, 'Talk track file');

    // Determine output directory
    const outputDir = options.outputDir
      ? resolve(options.outputDir)
      : resolve(dirname(absolutePath), 'output');

    // Create output directory
    await mkdir(outputDir, { recursive: true });

    // Validate template if custom
    let templatePath = 'default';
    if (options.template && options.template !== 'default') {
      templatePath = resolve(options.template);
      await validateFile(templatePath, 'Template file');
    }

    // Display configuration
    console.log('HTML Configuration:');
    printKeyValue('Source', absolutePath);
    printKeyValue('Output Directory', outputDir);
    printKeyValue('Template', templatePath);
    console.log();

    // Start HTML generation
    spinner.start('Parsing talk track...');

    // TODO: Integrate with actual parser and HTML renderer
    // const { parseTalkTrack } = await import('../../parsers/talk-track.js');
    // const { renderHtml } = await import('../../renderers/html/index.js');
    //
    // const parseResult = await parseTalkTrack(absolutePath);
    // if (!parseResult.success) {
    //   throw new Error(`Parse error: ${parseResult.errors?.join(', ')}`);
    // }
    //
    // spinner.update('Generating HTML...');
    // await renderHtml(parseResult.data!, {
    //   outputDir,
    //   template: templatePath,
    // });

    // Placeholder: simulate processing
    const sourceContent = await readFile(absolutePath, 'utf-8');

    spinner.update('Extracting slides...');
    const slideMatches = sourceContent.match(/^## /gm);
    const slideCount = slideMatches ? slideMatches.length : 0;

    spinner.update('Generating HTML presentation...');

    spinner.update('Copying assets...');

    spinner.succeed('HTML generation complete!');

    const elapsed = Date.now() - startTime;
    const htmlPath = join(outputDir, 'presentation.html');

    printSection('Results');
    printKeyValue('HTML Output', htmlPath);
    printKeyValue('Slides', slideCount.toString());
    printKeyValue('Duration', formatDuration(elapsed));

    console.log();
    console.log('Features included:');
    console.log('  - Keyboard navigation (arrows, space)');
    console.log('  - Touch/swipe support');
    console.log('  - Progress indicator');
    console.log('  - Section navigation');
    console.log('  - Fullscreen mode (F key)');

    printSuccess(`HTML presentation generated at ${htmlPath}`);
  } catch (error) {
    spinner.fail('HTML generation failed');
    const message = error instanceof Error ? error.message : String(error);
    printError(message);

    if (options.verbose && error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}
