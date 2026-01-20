/**
 * Orchestrator
 *
 * Main entry point for the presentation build pipeline.
 * Coordinates parsing, audio generation, timeline building, and rendering.
 */
import type { BuildManifest, BuildOptions } from './types.js';
export * from './types.js';
export { BuildStateMachine } from './state-machine.js';
export { CostTracker, aggregateCosts, formatCostSummary } from './cost-tracker.js';
export type { CostSummary } from './cost-tracker.js';
/**
 * Build a presentation from a talk track file.
 *
 * @param talkTrackPath - Path to the talk track markdown file
 * @param options - Build options including outputs, audio provider, voice, etc.
 * @returns The build manifest with paths to generated outputs
 *
 * @example
 * ```typescript
 * const manifest = await buildPresentation('./talk-track.md', {
 *   outputs: ['html', 'video', 'notes'],
 *   audioProvider: 'kokoro',
 *   voice: 'af_bella',
 *   outputDir: './output',
 *   onProgress: (state, progress, message) => {
 *     console.log(`[${progress}%] ${message}`);
 *   },
 * });
 * ```
 */
export declare function buildPresentation(talkTrackPath: string, options: BuildOptions): Promise<BuildManifest>;
/**
 * Resume a build from an existing manifest.
 *
 * @param manifestPath - Path to the manifest.json file
 * @returns The updated build manifest
 *
 * @example
 * ```typescript
 * const manifest = await resumeBuild('./output/manifest.json');
 * ```
 */
export declare function resumeBuild(manifestPath: string): Promise<BuildManifest>;
//# sourceMappingURL=index.d.ts.map