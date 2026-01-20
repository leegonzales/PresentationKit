/**
 * Cost Tracker
 *
 * Tracks resource usage and estimated costs for presentation builds.
 * Supports ElevenLabs character usage and Remotion render time.
 */
/**
 * Cost rates for different services.
 * Prices are in USD.
 */
const COST_RATES = {
    // ElevenLabs pricing tiers (characters per month)
    // Free: 10,000 chars
    // Starter ($5/mo): 30,000 chars (~$0.000167/char)
    // Creator ($22/mo): 100,000 chars (~$0.00022/char)
    // We use Creator tier pricing as a reasonable estimate
    elevenlabs: {
        perCharacter: 0.00022,
        description: 'ElevenLabs TTS (Creator tier estimate)',
    },
    // Remotion Cloud pricing
    // https://www.remotion.dev/docs/cloudrun/pricing
    // Lambda: ~$0.001 per second of video
    // We estimate based on render time, not video length
    remotion: {
        perSecondOfRender: 0.001,
        description: 'Remotion render time estimate',
    },
};
/**
 * Cost tracker for monitoring resource usage during builds.
 */
export class CostTracker {
    stateMachine;
    constructor(stateMachine) {
        this.stateMachine = stateMachine;
    }
    /**
     * Track ElevenLabs character usage.
     */
    async trackElevenLabsUsage(characterCount, description = 'Audio generation') {
        const cost = {
            type: 'elevenlabs_characters',
            description,
            quantity: characterCount,
            estimatedCostUsd: characterCount * COST_RATES.elevenlabs.perCharacter,
        };
        await this.stateMachine.addCost(cost);
    }
    /**
     * Track Remotion render time.
     */
    async trackRemotionRender(renderSeconds, description = 'Video rendering') {
        const cost = {
            type: 'remotion_render_seconds',
            description,
            quantity: renderSeconds,
            estimatedCostUsd: renderSeconds * COST_RATES.remotion.perSecondOfRender,
        };
        await this.stateMachine.addCost(cost);
    }
    /**
     * Track a generic API call (useful for tracking LLM calls, etc.)
     */
    async trackApiCall(description, estimatedCostUsd = null) {
        const cost = {
            type: 'api_call',
            description,
            quantity: 1,
            estimatedCostUsd,
        };
        await this.stateMachine.addCost(cost);
    }
    /**
     * Track Kokoro TTS usage (local, free).
     */
    async trackKokoroUsage(characterCount, description = 'Local Kokoro TTS') {
        const cost = {
            type: 'api_call',
            description,
            quantity: characterCount,
            estimatedCostUsd: null, // Free (local)
        };
        await this.stateMachine.addCost(cost);
    }
    /**
     * Get total costs from the manifest.
     */
    getTotalCosts() {
        const manifest = this.stateMachine.getManifest();
        return aggregateCosts(manifest.costs);
    }
}
/**
 * Aggregate costs from a manifest into a summary.
 */
export function aggregateCosts(costs) {
    const summary = {
        elevenLabsCharacters: 0,
        remotionRenderSeconds: 0,
        apiCalls: 0,
        totalEstimatedUsd: 0,
        breakdown: [],
    };
    const byType = {};
    for (const cost of costs) {
        // Aggregate totals
        if (cost.type === 'elevenlabs_characters') {
            summary.elevenLabsCharacters += cost.quantity;
        }
        else if (cost.type === 'remotion_render_seconds') {
            summary.remotionRenderSeconds += cost.quantity;
        }
        else if (cost.type === 'api_call') {
            summary.apiCalls += cost.quantity;
        }
        if (cost.estimatedCostUsd !== null) {
            summary.totalEstimatedUsd += cost.estimatedCostUsd;
        }
        // Aggregate by type for breakdown
        if (!byType[cost.type]) {
            byType[cost.type] = { quantity: 0, estimatedUsd: 0 };
        }
        byType[cost.type].quantity += cost.quantity;
        byType[cost.type].estimatedUsd += cost.estimatedCostUsd ?? 0;
    }
    // Build breakdown array
    for (const [type, data] of Object.entries(byType)) {
        summary.breakdown.push({
            type: type,
            quantity: data.quantity,
            estimatedUsd: data.estimatedUsd,
        });
    }
    return summary;
}
/**
 * Format cost summary for display.
 */
export function formatCostSummary(summary) {
    const lines = ['Cost Summary:', ''];
    if (summary.elevenLabsCharacters > 0) {
        lines.push(`  ElevenLabs: ${summary.elevenLabsCharacters.toLocaleString()} characters`);
    }
    if (summary.remotionRenderSeconds > 0) {
        lines.push(`  Remotion: ${summary.remotionRenderSeconds.toFixed(1)} seconds render time`);
    }
    if (summary.apiCalls > 0) {
        lines.push(`  API Calls: ${summary.apiCalls}`);
    }
    lines.push('');
    lines.push(`  Total Estimated Cost: $${summary.totalEstimatedUsd.toFixed(4)}`);
    return lines.join('\n');
}
//# sourceMappingURL=cost-tracker.js.map