/**
 * Cost Tracker
 *
 * Tracks resource usage and estimated costs for presentation builds.
 * Supports ElevenLabs character usage and Remotion render time.
 */
import type { CostEntry } from './types.js';
import type { BuildStateMachine } from './state-machine.js';
/**
 * Cost tracker for monitoring resource usage during builds.
 */
export declare class CostTracker {
    private stateMachine;
    constructor(stateMachine: BuildStateMachine);
    /**
     * Track ElevenLabs character usage.
     */
    trackElevenLabsUsage(characterCount: number, description?: string): Promise<void>;
    /**
     * Track Remotion render time.
     */
    trackRemotionRender(renderSeconds: number, description?: string): Promise<void>;
    /**
     * Track a generic API call (useful for tracking LLM calls, etc.)
     */
    trackApiCall(description: string, estimatedCostUsd?: number | null): Promise<void>;
    /**
     * Track Kokoro TTS usage (local, free).
     */
    trackKokoroUsage(characterCount: number, description?: string): Promise<void>;
    /**
     * Get total costs from the manifest.
     */
    getTotalCosts(): CostSummary;
}
/**
 * Summary of costs by category.
 */
export interface CostSummary {
    /** Total ElevenLabs characters used */
    elevenLabsCharacters: number;
    /** Total Remotion render seconds */
    remotionRenderSeconds: number;
    /** Total API calls made */
    apiCalls: number;
    /** Total estimated cost in USD */
    totalEstimatedUsd: number;
    /** Breakdown by cost type */
    breakdown: {
        type: CostEntry['type'];
        quantity: number;
        estimatedUsd: number;
    }[];
}
/**
 * Aggregate costs from a manifest into a summary.
 */
export declare function aggregateCosts(costs: CostEntry[]): CostSummary;
/**
 * Format cost summary for display.
 */
export declare function formatCostSummary(summary: CostSummary): string;
//# sourceMappingURL=cost-tracker.d.ts.map