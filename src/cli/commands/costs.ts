/**
 * Costs Command
 *
 * Display cost report for a build.
 */

import { Command } from 'commander';
import { resolve, join } from 'node:path';
import { stat } from 'node:fs/promises';

import { BuildStateMachine, aggregateCosts, formatCostSummary } from '../../orchestrator/index.js';
import type { CostEntry } from '../../orchestrator/types.js';
import {
  printHeader,
  printError,
  printKeyValue,
  printSection,
} from '../progress.js';
import chalk from 'chalk';

interface CostsOptions {
  json?: boolean;
  detailed?: boolean;
}

/**
 * Register the costs command with the program.
 */
export function registerCostsCommand(program: Command): void {
  program
    .command('costs')
    .description('Show cost report for a build')
    .argument('<output-dir>', 'Path to output directory with manifest.json')
    .option('--json', 'Output costs as JSON')
    .option('-d, --detailed', 'Show detailed cost breakdown')
    .action(costsAction);
}

/**
 * Costs command action handler.
 */
async function costsAction(
  outputDirPath: string,
  options: CostsOptions
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
      const summary = aggregateCosts(manifest.costs);
      console.log(
        JSON.stringify(
          {
            buildId: manifest.id,
            costs: manifest.costs,
            summary,
          },
          null,
          2
        )
      );
      return;
    }

    // Pretty print cost report
    printHeader('PresentationKit Cost Report');

    printKeyValue('Build ID', manifest.id);
    printKeyValue('Source', manifest.source.talkTrack);
    printKeyValue('Audio Provider', manifest.audioProvider);
    console.log();

    if (manifest.costs.length === 0) {
      console.log(chalk.gray('No costs recorded for this build.'));
      console.log();

      if (manifest.audioProvider === 'kokoro') {
        console.log(
          chalk.green('Kokoro TTS is a local provider with no API costs.')
        );
      }
      return;
    }

    // Aggregate and display summary
    const summary = aggregateCosts(manifest.costs);

    printSection('Summary');
    console.log(formatCostSummary(summary));

    // Detailed breakdown
    if (options.detailed) {
      printSection('Detailed Breakdown');
      printDetailedCosts(manifest.costs);
    }

    // Cost warnings
    printCostWarnings(summary);
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
 * Print detailed cost entries.
 */
function printDetailedCosts(costs: CostEntry[]): void {
  // Group by type
  const byType: Record<string, CostEntry[]> = {};

  for (const cost of costs) {
    if (!byType[cost.type]) {
      byType[cost.type] = [];
    }
    byType[cost.type].push(cost);
  }

  // Print each group
  for (const [type, entries] of Object.entries(byType)) {
    const typeLabel = formatCostType(type);
    console.log(chalk.bold(`  ${typeLabel}:`));

    for (const entry of entries) {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      const costStr =
        entry.estimatedCostUsd !== null
          ? chalk.yellow(`$${entry.estimatedCostUsd.toFixed(4)}`)
          : chalk.green('Free');

      console.log(
        `    ${chalk.gray(timestamp)} ${entry.description}: ${entry.quantity} (${costStr})`
      );
    }
    console.log();
  }
}

/**
 * Format cost type for display.
 */
function formatCostType(type: string): string {
  const labels: Record<string, string> = {
    elevenlabs_characters: 'ElevenLabs TTS',
    remotion_render_seconds: 'Remotion Rendering',
    api_call: 'API Calls',
  };
  return labels[type] || type;
}

/**
 * Print cost warnings if thresholds exceeded.
 */
function printCostWarnings(summary: ReturnType<typeof aggregateCosts>): void {
  const warnings: string[] = [];

  // ElevenLabs character limits (approximate tier limits)
  if (summary.elevenLabsCharacters > 100000) {
    warnings.push(
      `ElevenLabs usage (${summary.elevenLabsCharacters.toLocaleString()} chars) ` +
        'exceeds Creator tier limit (100K/month)'
    );
  } else if (summary.elevenLabsCharacters > 30000) {
    warnings.push(
      `ElevenLabs usage (${summary.elevenLabsCharacters.toLocaleString()} chars) ` +
        'exceeds Starter tier limit (30K/month)'
    );
  }

  // Total cost warning
  if (summary.totalEstimatedUsd > 5.0) {
    warnings.push(
      `Total estimated cost ($${summary.totalEstimatedUsd.toFixed(2)}) ` +
        'exceeds $5.00 warning threshold'
    );
  }

  if (warnings.length > 0) {
    console.log();
    console.log(chalk.yellow.bold('Warnings:'));
    for (const warning of warnings) {
      console.log(chalk.yellow(`  ! ${warning}`));
    }
    console.log();
  }
}
