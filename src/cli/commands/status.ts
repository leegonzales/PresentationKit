/**
 * Status Command
 *
 * Check the status of a build from its manifest.
 */

import { Command } from 'commander';
import { resolve, join } from 'node:path';
import { stat, readdir } from 'node:fs/promises';

import { BuildStateMachine } from '../../orchestrator/index.js';
import type { BuildManifest, BuildState } from '../../orchestrator/types.js';
import {
  printHeader,
  printError,
  printKeyValue,
  printSection,
  printManifestSummary,
  formatDuration,
} from '../progress.js';
import chalk from 'chalk';

interface StatusOptions {
  json?: boolean;
  verbose?: boolean;
}

/**
 * Register the status command with the program.
 */
export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Check build status')
    .argument('<output-dir>', 'Path to output directory with manifest.json')
    .option('--json', 'Output status as JSON')
    .option('-v, --verbose', 'Show detailed status')
    .action(statusAction);
}

/**
 * Status command action handler.
 */
async function statusAction(
  outputDirPath: string,
  options: StatusOptions
): Promise<void> {
  try {
    // Resolve output directory
    const absoluteDir = resolve(outputDirPath);
    const manifestPath = join(absoluteDir, 'manifest.json');

    // Check manifest exists
    try {
      await stat(manifestPath);
    } catch {
      if (options.json) {
        console.log(JSON.stringify({ error: 'Manifest not found' }, null, 2));
      } else {
        printError(
          'Manifest not found',
          `No manifest.json at ${manifestPath}`
        );
      }
      process.exit(1);
    }

    // Load manifest
    const manifest = await BuildStateMachine.loadManifest(manifestPath);

    // JSON output mode
    if (options.json) {
      console.log(JSON.stringify(manifest, null, 2));
      return;
    }

    // Pretty print status
    printHeader('PresentationKit Build Status');
    printManifestSummary(manifest);

    // Verbose mode: show additional details
    if (options.verbose) {
      await printVerboseStatus(manifest, absoluteDir);
    }

    // Print quick summary line
    printQuickStatus(manifest);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (options.json) {
      console.log(JSON.stringify({ error: message }, null, 2));
    } else {
      printError(message);
    }
    process.exit(1);
  }
}

/**
 * Print verbose status information.
 */
async function printVerboseStatus(
  manifest: BuildManifest,
  outputDir: string
): Promise<void> {
  printSection('Detailed Information');

  // Build timing
  if (manifest.createdAt) {
    const created = new Date(manifest.createdAt);
    printKeyValue('Created', created.toLocaleString());
  }

  if (manifest.completedAt) {
    const completed = new Date(manifest.completedAt);
    printKeyValue('Completed', completed.toLocaleString());

    // Calculate total build time
    if (manifest.createdAt) {
      const duration =
        new Date(manifest.completedAt).getTime() -
        new Date(manifest.createdAt).getTime();
      printKeyValue('Total Time', formatDuration(duration));
    }
  }

  // Audio configuration
  printKeyValue('Audio Provider', manifest.audioProvider);
  printKeyValue('Voice', manifest.voice);
  printKeyValue('Requested Outputs', manifest.requestedOutputs.join(', '));

  if (manifest.videoQuality) {
    printKeyValue('Video Quality', manifest.videoQuality);
  }

  // File system status
  printSection('File System');

  // Check which output files exist
  const outputFiles = [
    { key: 'HTML', path: manifest.outputs.html },
    { key: 'Video', path: manifest.outputs.video },
    { key: 'Notes', path: manifest.outputs.notes },
    { key: 'Timeline', path: manifest.outputs.timeline },
  ];

  for (const { key, path } of outputFiles) {
    if (path) {
      try {
        const stats = await stat(path);
        const size = formatFileSize(stats.size);
        console.log(`  ${chalk.green('+')} ${key}: ${path} (${size})`);
      } catch {
        console.log(`  ${chalk.red('!')} ${key}: ${path} (missing)`);
      }
    }
  }

  // Audio files
  const audioDir = join(outputDir, 'audio');
  try {
    const audioFiles = await readdir(audioDir);
    const audioCount = audioFiles.filter((f) =>
      f.endsWith('.mp3') || f.endsWith('.wav')
    ).length;
    console.log(`  ${chalk.blue('*')} Audio files: ${audioCount}`);
  } catch {
    console.log(`  ${chalk.gray('-')} Audio directory: not found`);
  }

  // Cost summary
  if (manifest.costs.length > 0) {
    printSection('Cost Breakdown');

    for (const cost of manifest.costs) {
      const costStr = cost.estimatedCostUsd !== null
        ? `$${cost.estimatedCostUsd.toFixed(4)}`
        : 'Free';
      console.log(`  ${cost.description}: ${cost.quantity} ${cost.type} (${costStr})`);
    }
  }
}

/**
 * Print a quick one-line status summary.
 */
function printQuickStatus(manifest: BuildManifest): void {
  const stateEmoji = getStateEmoji(manifest.state);
  const stateColor = getStateColor(manifest.state);

  console.log();
  console.log(
    stateColor(
      `${stateEmoji} ${manifest.id}: ${manifest.state.toUpperCase()}`
    )
  );

  if (manifest.state === 'failed' && manifest.error) {
    console.log(chalk.red(`   Error: ${manifest.error}`));
  }

  if (manifest.state === 'complete') {
    const outputs = Object.keys(manifest.outputs).filter(
      (k) => manifest.outputs[k as keyof typeof manifest.outputs]
    );
    console.log(chalk.gray(`   Outputs: ${outputs.join(', ')}`));
  }

  console.log();
}

/**
 * Get emoji for build state.
 */
function getStateEmoji(state: BuildState): string {
  const emojis: Record<BuildState, string> = {
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
  return emojis[state];
}

/**
 * Get color function for build state.
 */
function getStateColor(state: BuildState): (text: string) => string {
  const colors: Record<BuildState, (text: string) => string> = {
    init: chalk.gray,
    parsing: chalk.blue,
    generating_audio: chalk.cyan,
    building_timeline: chalk.magenta,
    rendering_html: chalk.yellow,
    rendering_video: chalk.green,
    rendering_notes: chalk.white,
    complete: chalk.green.bold,
    failed: chalk.red.bold,
  };
  return colors[state];
}

/**
 * Format file size in human-readable format.
 */
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
