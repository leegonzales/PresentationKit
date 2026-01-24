/**
 * Progress Display Helpers
 *
 * Provides consistent progress display for CLI commands using chalk and ora.
 * Includes spinners, progress bars, and formatted output.
 */

import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import type { BuildState, BuildManifest } from '../orchestrator/types.js';

/**
 * State colors for visual consistency.
 */
const STATE_COLORS: Record<BuildState, (text: string) => string> = {
  init: chalk.gray,
  parsing: chalk.blue,
  generating_audio: chalk.cyan,
  building_timeline: chalk.magenta,
  rendering_html: chalk.yellow,
  rendering_video: chalk.green,
  rendering_notes: chalk.white,
  complete: chalk.green,
  failed: chalk.red,
};

/**
 * State icons for status display.
 */
const STATE_ICONS: Record<BuildState, string> = {
  init: '[ ]',
  parsing: '[*]',
  generating_audio: '[*]',
  building_timeline: '[*]',
  rendering_html: '[*]',
  rendering_video: '[*]',
  rendering_notes: '[*]',
  complete: '[+]',
  failed: '[!]',
};

/**
 * Human-readable state descriptions.
 */
const STATE_DESCRIPTIONS: Record<BuildState, string> = {
  init: 'Initializing',
  parsing: 'Parsing talk track',
  generating_audio: 'Generating audio',
  building_timeline: 'Building timeline',
  rendering_html: 'Rendering HTML',
  rendering_video: 'Rendering video',
  rendering_notes: 'Generating notes',
  complete: 'Complete',
  failed: 'Failed',
};

/**
 * Progress spinner manager.
 * Wraps ora with convenient methods for build progress.
 */
export class ProgressSpinner {
  private spinner: Ora;
  private verbose: boolean;
  private startTime: number;

  constructor(options: { verbose?: boolean } = {}) {
    this.verbose = options.verbose ?? false;
    this.startTime = Date.now();
    this.spinner = ora({
      spinner: 'dots',
      color: 'cyan',
    });
  }

  /**
   * Start the spinner with a message.
   */
  start(message: string): void {
    this.spinner.start(message);
  }

  /**
   * Update spinner text.
   */
  update(message: string): void {
    this.spinner.text = message;
  }

  /**
   * Update for a specific build state.
   */
  setState(state: BuildState, progress: number, message?: string): void {
    const colorFn = STATE_COLORS[state];
    const description = message || STATE_DESCRIPTIONS[state];
    const progressBar = this.createProgressBar(progress);

    this.spinner.text = colorFn(`${progressBar} ${description}`);
  }

  /**
   * Mark current operation as successful.
   */
  succeed(message: string): void {
    this.spinner.succeed(chalk.green(message));
  }

  /**
   * Mark current operation as failed.
   */
  fail(message: string): void {
    this.spinner.fail(chalk.red(message));
  }

  /**
   * Show warning.
   */
  warn(message: string): void {
    this.spinner.warn(chalk.yellow(message));
  }

  /**
   * Show info message.
   */
  info(message: string): void {
    this.spinner.info(chalk.blue(message));
  }

  /**
   * Stop spinner without status.
   */
  stop(): void {
    this.spinner.stop();
  }

  /**
   * Log verbose message (only if verbose mode enabled).
   */
  verbose_log(message: string): void {
    if (this.verbose) {
      this.spinner.stop();
      console.log(chalk.gray(`  [debug] ${message}`));
      this.spinner.start();
    }
  }

  /**
   * Get elapsed time in human-readable format.
   */
  getElapsedTime(): string {
    const elapsed = Date.now() - this.startTime;
    return formatDuration(elapsed);
  }

  /**
   * Create a simple ASCII progress bar.
   */
  private createProgressBar(progress: number): string {
    const width = 20;
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    const bar = '='.repeat(filled) + '-'.repeat(empty);
    return `[${bar}] ${progress}%`;
  }
}

/**
 * Format a duration in milliseconds to human-readable format.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Print a formatted header for CLI output.
 */
export function printHeader(title: string): void {
  console.log();
  console.log(chalk.bold.blue('='.repeat(60)));
  console.log(chalk.bold.blue(`  ${title}`));
  console.log(chalk.bold.blue('='.repeat(60)));
  console.log();
}

/**
 * Print a formatted section header.
 */
export function printSection(title: string): void {
  console.log();
  console.log(chalk.bold.white(`--- ${title} ---`));
  console.log();
}

/**
 * Print a key-value pair.
 */
export function printKeyValue(key: string, value: string | number | undefined): void {
  if (value !== undefined) {
    console.log(`  ${chalk.gray(key + ':')} ${value}`);
  }
}

/**
 * Print build manifest summary.
 */
export function printManifestSummary(manifest: BuildManifest): void {
  const stateColor = STATE_COLORS[manifest.state];
  const stateIcon = STATE_ICONS[manifest.state];

  console.log();
  console.log(chalk.bold('Build Status'));
  console.log();

  printKeyValue('Build ID', manifest.id);
  printKeyValue('Source', manifest.source.talkTrack);
  printKeyValue('Hash', manifest.source.hash);
  console.log(`  ${chalk.gray('State:')} ${stateColor(`${stateIcon} ${STATE_DESCRIPTIONS[manifest.state]}`)}`);

  if (manifest.error) {
    console.log(`  ${chalk.gray('Error:')} ${chalk.red(manifest.error)}`);
  }

  printKeyValue('Created', manifest.createdAt);
  printKeyValue('Completed', manifest.completedAt);

  // Outputs
  if (Object.keys(manifest.outputs).length > 0) {
    console.log();
    console.log(chalk.bold('  Outputs:'));
    if (manifest.outputs.html) {
      console.log(`    ${chalk.green('+')} HTML: ${manifest.outputs.html}`);
    }
    if (manifest.outputs.video) {
      console.log(`    ${chalk.green('+')} Video: ${manifest.outputs.video}`);
    }
    if (manifest.outputs.notes) {
      console.log(`    ${chalk.green('+')} Notes: ${manifest.outputs.notes}`);
    }
    if (manifest.outputs.timeline) {
      console.log(`    ${chalk.green('+')} Timeline: ${manifest.outputs.timeline}`);
    }
  }

  // Assets
  if (manifest.assets.audio.length > 0 || manifest.assets.images.length > 0) {
    console.log();
    console.log(chalk.bold('  Assets:'));
    if (manifest.assets.audio.length > 0) {
      console.log(`    Audio files: ${manifest.assets.audio.length}`);
    }
    if (manifest.assets.images.length > 0) {
      console.log(`    Image files: ${manifest.assets.images.length}`);
    }
  }

  console.log();
}

/**
 * Print error message with formatting.
 */
export function printError(message: string, details?: string): void {
  console.error();
  console.error(chalk.red.bold('Error: ') + chalk.red(message));
  if (details) {
    console.error(chalk.gray(`  ${details}`));
  }
  console.error();
}

/**
 * Print structured error with optional list of sub-errors.
 * Used for TalkTrackParseError and TimelineBuildError.
 */
export function printStructuredError(
  title: string,
  error: { message: string; errors?: string[] },
  helpText?: string
): void {
  printError(title);
  if (error.errors && error.errors.length > 0) {
    console.error();
    error.errors.forEach((e) => console.error(`  - ${e}`));
  } else {
    console.error(`  - ${error.message}`);
  }
  if (helpText) {
    console.error();
    console.error(helpText);
  }
}

/**
 * Print success message with formatting.
 */
export function printSuccess(message: string): void {
  console.log();
  console.log(chalk.green.bold('[+] ') + chalk.green(message));
  console.log();
}

/**
 * Print warning message with formatting.
 */
export function printWarning(message: string): void {
  console.log();
  console.log(chalk.yellow.bold('[!] ') + chalk.yellow(message));
  console.log();
}

/**
 * Print info message with formatting.
 */
export function printInfo(message: string): void {
  console.log(chalk.blue('[*] ') + message);
}

/**
 * Create a progress callback for the orchestrator.
 */
export function createProgressCallback(
  spinner: ProgressSpinner
): (state: BuildState, progress: number, message: string) => void {
  return (state: BuildState, progress: number, message: string) => {
    spinner.setState(state, progress, message);
  };
}

/**
 * Validate that a file exists and is readable.
 */
export async function validateFile(
  filePath: string,
  description: string = 'File'
): Promise<void> {
  const { access, constants } = await import('node:fs/promises');

  try {
    await access(filePath, constants.R_OK);
  } catch {
    throw new Error(`${description} not found or not readable: ${filePath}`);
  }
}

/**
 * Validate that a directory exists.
 */
export async function validateDirectory(
  dirPath: string,
  description: string = 'Directory'
): Promise<void> {
  const { stat } = await import('node:fs/promises');

  try {
    const stats = await stat(dirPath);
    if (!stats.isDirectory()) {
      throw new Error(`${description} is not a directory: ${dirPath}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`${description} not found: ${dirPath}`);
    }
    throw error;
  }
}

/**
 * Parse comma-separated output formats.
 */
export function parseOutputFormats(
  formats: string
): ('html' | 'video' | 'notes')[] {
  const validFormats = new Set(['html', 'video', 'notes']);
  const result: ('html' | 'video' | 'notes')[] = [];

  for (const format of formats.split(',')) {
    const trimmed = format.trim().toLowerCase();
    if (!validFormats.has(trimmed)) {
      throw new Error(
        `Invalid output format: ${trimmed}. Valid formats: html, video, notes`
      );
    }
    result.push(trimmed as 'html' | 'video' | 'notes');
  }

  if (result.length === 0) {
    throw new Error('At least one output format must be specified');
  }

  return result;
}
