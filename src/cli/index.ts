#!/usr/bin/env node
/**
 * PresentationKit CLI
 *
 * Main entry point for the pk command-line interface.
 * Transforms talk tracks into multi-format presentations.
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Import command modules
import { registerBuildCommand } from './commands/build.js';
import { registerAudioCommand } from './commands/audio.js';
import { registerVideoCommand } from './commands/video.js';
import { registerHtmlCommand } from './commands/html.js';
import { registerNotesCommand } from './commands/notes.js';
import { registerResumeCommand } from './commands/resume.js';
import { registerStatusCommand } from './commands/status.js';
import { registerCostsCommand } from './commands/costs.js';

/**
 * Get package version from package.json.
 */
function getVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageJsonPath = join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Create and configure the CLI program.
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name('pk')
    .description('PresentationKit - Transform talk tracks into presentations')
    .version(getVersion(), '-V, --version', 'Output the version number')
    .option('-v, --verbose', 'Enable verbose output for debugging')
    .configureHelp({
      sortSubcommands: true,
      sortOptions: true,
    });

  // Register all commands
  registerBuildCommand(program);
  registerAudioCommand(program);
  registerVideoCommand(program);
  registerHtmlCommand(program);
  registerNotesCommand(program);
  registerResumeCommand(program);
  registerStatusCommand(program);
  registerCostsCommand(program);

  // Add examples to help text
  program.addHelpText(
    'after',
    `
Examples:
  $ pk build talk-track.md --output html,video,notes
  $ pk audio talk-track.md --voice af_heart --provider kokoro
  $ pk video talk-track.md --quality 1080p
  $ pk html talk-track.md
  $ pk notes talk-track.md
  $ pk resume ./output/
  $ pk status ./output/
  $ pk costs ./output/

For more information, visit: https://github.com/leegonzales/PresentationKit
`
  );

  return program;
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  const program = createProgram();

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    // Commander handles most errors, but we catch any uncaught ones
    if (error instanceof Error) {
      console.error(`\nError: ${error.message}\n`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

// Run CLI
main();
