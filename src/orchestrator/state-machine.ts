/**
 * State Machine
 *
 * Manages build state transitions with validation and persistence.
 * Supports resuming builds from the last successful state.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type {
  BuildState,
  BuildManifest,
  StateTransition,
  BuildProgress,
} from './types.js';

/**
 * Valid state transitions for the build pipeline.
 * Each transition defines source, target, and resume capability.
 */
const TRANSITIONS: StateTransition[] = [
  // Normal pipeline flow
  { from: 'init', to: 'parsing', canResume: true },
  { from: 'parsing', to: 'generating_audio', canResume: true },
  { from: 'generating_audio', to: 'building_timeline', canResume: true },
  { from: 'building_timeline', to: 'rendering_html', canResume: true },
  { from: 'building_timeline', to: 'rendering_video', canResume: true },
  { from: 'building_timeline', to: 'rendering_notes', canResume: true },
  { from: 'rendering_html', to: 'rendering_video', canResume: true },
  { from: 'rendering_html', to: 'rendering_notes', canResume: true },
  { from: 'rendering_html', to: 'complete', canResume: false },
  { from: 'rendering_video', to: 'rendering_notes', canResume: true },
  { from: 'rendering_video', to: 'complete', canResume: false },
  { from: 'rendering_notes', to: 'complete', canResume: false },
  // Skip states (when output not requested)
  { from: 'building_timeline', to: 'complete', canResume: false },
  // Error transitions (from any state)
  { from: 'init', to: 'failed', canResume: false },
  { from: 'parsing', to: 'failed', canResume: false },
  { from: 'generating_audio', to: 'failed', canResume: false },
  { from: 'building_timeline', to: 'failed', canResume: false },
  { from: 'rendering_html', to: 'failed', canResume: false },
  { from: 'rendering_video', to: 'failed', canResume: false },
  { from: 'rendering_notes', to: 'failed', canResume: false },
];

/**
 * Progress percentages for each state.
 */
const STATE_PROGRESS: Record<BuildState, number> = {
  init: 0,
  parsing: 5,
  generating_audio: 20,
  building_timeline: 50,
  rendering_html: 60,
  rendering_video: 80,
  rendering_notes: 90,
  complete: 100,
  failed: 0,
};

/**
 * Human-readable messages for each state.
 */
const STATE_MESSAGES: Record<BuildState, string> = {
  init: 'Initializing build...',
  parsing: 'Parsing talk track...',
  generating_audio: 'Generating audio narration...',
  building_timeline: 'Building presentation timeline...',
  rendering_html: 'Rendering HTML presentation...',
  rendering_video: 'Rendering video...',
  rendering_notes: 'Generating speaker notes...',
  complete: 'Build complete!',
  failed: 'Build failed',
};

/**
 * State order for determining resume points.
 */
const STATE_ORDER: BuildState[] = [
  'init',
  'parsing',
  'generating_audio',
  'building_timeline',
  'rendering_html',
  'rendering_video',
  'rendering_notes',
  'complete',
];

/**
 * State machine for managing build pipeline state.
 */
export class BuildStateMachine {
  private manifest: BuildManifest;
  private manifestPath: string;
  private startTime: number;
  private progressCallback?: (state: BuildState, progress: number, message: string) => void;

  constructor(manifest: BuildManifest, outputDir: string) {
    this.manifest = manifest;
    this.manifestPath = join(outputDir, 'manifest.json');
    this.startTime = Date.now();
  }

  /**
   * Set progress callback for state change notifications.
   */
  setProgressCallback(callback: (state: BuildState, progress: number, message: string) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Get current build state.
   */
  getState(): BuildState {
    return this.manifest.state;
  }

  /**
   * Get the full manifest.
   */
  getManifest(): BuildManifest {
    return this.manifest;
  }

  /**
   * Get build progress information.
   */
  getProgress(): BuildProgress {
    return {
      state: this.manifest.state,
      progress: STATE_PROGRESS[this.manifest.state],
      message: STATE_MESSAGES[this.manifest.state],
      elapsedMs: Date.now() - this.startTime,
    };
  }

  /**
   * Check if a transition is valid.
   */
  canTransitionTo(newState: BuildState): boolean {
    // Always allow transition to failed
    if (newState === 'failed') {
      return true;
    }

    return TRANSITIONS.some(
      (t) => t.from === this.manifest.state && t.to === newState
    );
  }

  /**
   * Transition to a new state with validation.
   * Persists manifest to disk after each transition.
   */
  async transitionTo(
    newState: BuildState,
    options?: { errorMessage?: string }
  ): Promise<void> {
    // Validate transition
    if (!this.canTransitionTo(newState)) {
      throw new Error(
        `Invalid state transition: ${this.manifest.state} -> ${newState}`
      );
    }

    // Track last successful state before transitioning
    if (newState !== 'failed' && this.manifest.state !== 'init') {
      this.manifest.lastSuccessfulState = this.manifest.state;
    }

    // Update state
    this.manifest.state = newState;

    // Handle error state
    if (newState === 'failed' && options?.errorMessage) {
      this.manifest.error = options.errorMessage;
    }

    // Handle completion
    if (newState === 'complete') {
      this.manifest.completedAt = new Date().toISOString();
    }

    // Persist to disk
    await this.persistManifest();

    // Notify progress callback
    if (this.progressCallback) {
      this.progressCallback(
        newState,
        STATE_PROGRESS[newState],
        STATE_MESSAGES[newState]
      );
    }
  }

  /**
   * Mark build as failed with error message.
   */
  async fail(errorMessage: string): Promise<void> {
    await this.transitionTo('failed', { errorMessage });
  }

  /**
   * Check if the current state can be resumed.
   */
  canResume(): boolean {
    const transition = TRANSITIONS.find((t) => t.from === this.manifest.state);
    return transition?.canResume ?? false;
  }

  /**
   * Get the state to resume from.
   * Returns the last successful state that can continue the pipeline.
   */
  getResumeState(): BuildState | null {
    if (this.manifest.state === 'complete') {
      return null; // Already complete
    }

    if (this.manifest.state === 'failed' && this.manifest.lastSuccessfulState) {
      return this.manifest.lastSuccessfulState;
    }

    // If in a resumable state, return it
    if (this.canResume()) {
      return this.manifest.state;
    }

    return null;
  }

  /**
   * Get the next state in the pipeline based on requested outputs.
   */
  getNextState(): BuildState | null {
    const currentIndex = STATE_ORDER.indexOf(this.manifest.state);
    if (currentIndex === -1 || currentIndex >= STATE_ORDER.length - 1) {
      return null;
    }

    const nextState = STATE_ORDER[currentIndex + 1];

    // Skip rendering states if output not requested
    if (nextState === 'rendering_html' && !this.manifest.requestedOutputs.includes('html')) {
      // Check for video or notes
      if (this.manifest.requestedOutputs.includes('video')) {
        return 'rendering_video';
      }
      if (this.manifest.requestedOutputs.includes('notes')) {
        return 'rendering_notes';
      }
      return 'complete';
    }

    if (nextState === 'rendering_video' && !this.manifest.requestedOutputs.includes('video')) {
      if (this.manifest.requestedOutputs.includes('notes')) {
        return 'rendering_notes';
      }
      return 'complete';
    }

    if (nextState === 'rendering_notes' && !this.manifest.requestedOutputs.includes('notes')) {
      return 'complete';
    }

    return nextState;
  }

  /**
   * Update manifest outputs.
   */
  async updateOutputs(outputs: Partial<BuildManifest['outputs']>): Promise<void> {
    this.manifest.outputs = { ...this.manifest.outputs, ...outputs };
    await this.persistManifest();
  }

  /**
   * Update manifest assets.
   */
  async updateAssets(assets: Partial<BuildManifest['assets']>): Promise<void> {
    if (assets.audio) {
      this.manifest.assets.audio = [...this.manifest.assets.audio, ...assets.audio];
    }
    if (assets.images) {
      this.manifest.assets.images = [...this.manifest.assets.images, ...assets.images];
    }
    await this.persistManifest();
  }

  /**
   * Add a cost entry to the manifest.
   */
  async addCost(cost: Omit<BuildManifest['costs'][0], 'timestamp'>): Promise<void> {
    this.manifest.costs.push({
      ...cost,
      timestamp: new Date().toISOString(),
    });
    await this.persistManifest();
  }

  /**
   * Persist manifest to disk.
   */
  async persistManifest(): Promise<void> {
    // Ensure directory exists
    await mkdir(dirname(this.manifestPath), { recursive: true });
    await writeFile(this.manifestPath, JSON.stringify(this.manifest, null, 2));
  }

  /**
   * Load a manifest from disk.
   */
  static async loadManifest(manifestPath: string): Promise<BuildManifest> {
    const content = await readFile(manifestPath, 'utf-8');
    return JSON.parse(content) as BuildManifest;
  }

  /**
   * Create a state machine from an existing manifest file.
   */
  static async fromManifestPath(manifestPath: string): Promise<BuildStateMachine> {
    const manifest = await BuildStateMachine.loadManifest(manifestPath);
    const outputDir = dirname(manifestPath);
    return new BuildStateMachine(manifest, outputDir);
  }
}
