/**
 * State Machine
 *
 * Manages build state transitions with validation and persistence.
 * Supports resuming builds from the last successful state.
 */
import type { BuildState, BuildManifest, BuildProgress } from './types.js';
/**
 * State machine for managing build pipeline state.
 */
export declare class BuildStateMachine {
    private manifest;
    private manifestPath;
    private startTime;
    private progressCallback?;
    constructor(manifest: BuildManifest, outputDir: string);
    /**
     * Set progress callback for state change notifications.
     */
    setProgressCallback(callback: (state: BuildState, progress: number, message: string) => void): void;
    /**
     * Get current build state.
     */
    getState(): BuildState;
    /**
     * Get the full manifest.
     */
    getManifest(): BuildManifest;
    /**
     * Get build progress information.
     */
    getProgress(): BuildProgress;
    /**
     * Check if a transition is valid.
     */
    canTransitionTo(newState: BuildState): boolean;
    /**
     * Transition to a new state with validation.
     * Persists manifest to disk after each transition.
     */
    transitionTo(newState: BuildState, options?: {
        errorMessage?: string;
    }): Promise<void>;
    /**
     * Mark build as failed with error message.
     */
    fail(errorMessage: string): Promise<void>;
    /**
     * Check if the current state can be resumed.
     */
    canResume(): boolean;
    /**
     * Get the state to resume from.
     * Returns the last successful state that can continue the pipeline.
     */
    getResumeState(): BuildState | null;
    /**
     * Get the next state in the pipeline based on requested outputs.
     */
    getNextState(): BuildState | null;
    /**
     * Update manifest outputs.
     */
    updateOutputs(outputs: Partial<BuildManifest['outputs']>): Promise<void>;
    /**
     * Update manifest assets.
     */
    updateAssets(assets: Partial<BuildManifest['assets']>): Promise<void>;
    /**
     * Add a cost entry to the manifest.
     */
    addCost(cost: Omit<BuildManifest['costs'][0], 'timestamp'>): Promise<void>;
    /**
     * Persist manifest to disk.
     */
    persistManifest(): Promise<void>;
    /**
     * Load a manifest from disk.
     */
    static loadManifest(manifestPath: string): Promise<BuildManifest>;
    /**
     * Create a state machine from an existing manifest file.
     */
    static fromManifestPath(manifestPath: string): Promise<BuildStateMachine>;
}
//# sourceMappingURL=state-machine.d.ts.map