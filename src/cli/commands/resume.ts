/**
 * Resume Command
 *
 * Resume a failed or interrupted build from its last checkpoint.
 */

import { Command } from 'commander';
import { resolve, join } from 'node:path';
import { stat } from 'node:fs/promises';

import { resumeBuild, BuildStateMachine } from '../../orchestrator/index.js';
import {
  ProgressSpinner,
  printHeader,
  printSuccess,
  printError,
  printKeyValue,
  printSection,
  printWarning,
  printManifestSummary,
  createProgressCallback,
  formatDuration,
} from '../progress.js';

interface ResumeOptions {
  verbose?: boolean;
}

/**
 * Register the resume command with the program.
 */
export function registerResumeCommand(program: Command): void {
  program
    .command('resume')
    .description('Resume a failed or interrupted build')
    .argument('<output-dir>', 'Path to output directory with manifest.json')
    .option('-v, --verbose', 'Enable verbose output')
    .action(resumeAction);
}

/**
 * Resume command action handler.
 */
async function resumeAction(
  outputDirPath: string,
  options: ResumeOptions
): Promise<void> {
  const startTime = Date.now();
  const spinner = new ProgressSpinner({ verbose: options.verbose });

  printHeader('PresentationKit Resume Build');

  try {
    // Resolve output directory
    const absoluteDir = resolve(outputDirPath);
    const manifestPath = join(absoluteDir, 'manifest.json');

    // Check manifest exists
    try {
      await stat(manifestPath);
    } catch {
      throw new Error(
        `Manifest not found at ${manifestPath}. ` +
        'This directory may not contain a PresentationKit build.'
      );
    }

    // Load existing manifest to show status
    spinner.start('Loading build manifest...');
    const stateMachine = await BuildStateMachine.fromManifestPath(manifestPath);
    const manifest = stateMachine.getManifest();
    spinner.stop();

    // Display current build status
    printSection('Current Build Status');
    printManifestSummary(manifest);

    // Check if resumable
    const resumeState = stateMachine.getResumeState();

    if (manifest.state === 'complete') {
      printWarning('Build is already complete. Nothing to resume.');
      return;
    }

    if (!resumeState) {
      throw new Error(
        `Cannot resume from state: ${manifest.state}. ` +
        'Build may be in a non-resumable state.'
      );
    }

    console.log(`Resuming from state: ${resumeState}`);
    console.log();

    // Confirm resume
    spinner.start('Resuming build...');

    // Resume the build
    const updatedManifest = await resumeBuild(manifestPath);

    spinner.succeed('Build resumed successfully!');

    const elapsed = Date.now() - startTime;

    printSection('Resume Results');
    printKeyValue('Final State', updatedManifest.state);
    printKeyValue('Resume Duration', formatDuration(elapsed));

    if (updatedManifest.outputs.html) {
      printKeyValue('HTML', updatedManifest.outputs.html);
    }
    if (updatedManifest.outputs.video) {
      printKeyValue('Video', updatedManifest.outputs.video);
    }
    if (updatedManifest.outputs.notes) {
      printKeyValue('Notes', updatedManifest.outputs.notes);
    }

    if (updatedManifest.state === 'complete') {
      printSuccess('Build completed successfully!');
    } else if (updatedManifest.state === 'failed') {
      printError('Build failed during resume', updatedManifest.error);
      process.exit(1);
    }
  } catch (error) {
    spinner.fail('Resume failed');
    const message = error instanceof Error ? error.message : String(error);
    printError(message);

    if (options.verbose && error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}
