/**
 * Orchestrator
 *
 * Main entry point for the presentation build pipeline.
 * Coordinates parsing, audio generation, timeline building, and rendering.
 */
import { createHash } from 'node:crypto';
import { readFile, mkdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { nanoid } from 'nanoid';
import { BuildStateMachine } from './state-machine.js';
import { CostTracker } from './cost-tracker.js';
// Re-export types and utilities
export * from './types.js';
export { BuildStateMachine } from './state-machine.js';
export { CostTracker, aggregateCosts, formatCostSummary } from './cost-tracker.js';
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
export async function buildPresentation(talkTrackPath, options) {
    // Resolve paths
    const absoluteTalkTrackPath = resolve(talkTrackPath);
    const absoluteOutputDir = resolve(options.outputDir);
    // Ensure output directory exists
    await mkdir(absoluteOutputDir, { recursive: true });
    // Read source file and compute hash
    const sourceContent = await readFile(absoluteTalkTrackPath, 'utf-8');
    const sourceHash = createHash('sha256').update(sourceContent).digest('hex').slice(0, 16);
    // Create initial manifest
    const manifest = {
        id: nanoid(),
        createdAt: new Date().toISOString(),
        source: {
            talkTrack: absoluteTalkTrackPath,
            hash: sourceHash,
        },
        outputs: {},
        assets: {
            audio: [],
            images: [],
        },
        costs: [],
        state: 'init',
        audioProvider: options.audioProvider,
        voice: options.voice,
        requestedOutputs: options.outputs,
        videoQuality: options.videoQuality,
    };
    // Create state machine
    const stateMachine = new BuildStateMachine(manifest, absoluteOutputDir);
    // Set progress callback if provided
    if (options.onProgress) {
        stateMachine.setProgressCallback(options.onProgress);
    }
    // Create cost tracker
    const costTracker = new CostTracker(stateMachine);
    // Run the build pipeline
    return runBuildPipeline(stateMachine, costTracker, absoluteOutputDir);
}
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
export async function resumeBuild(manifestPath) {
    const absoluteManifestPath = resolve(manifestPath);
    const outputDir = dirname(absoluteManifestPath);
    // Load existing state machine
    const stateMachine = await BuildStateMachine.fromManifestPath(absoluteManifestPath);
    const costTracker = new CostTracker(stateMachine);
    // Check if we can resume
    const resumeState = stateMachine.getResumeState();
    if (!resumeState) {
        throw new Error(`Cannot resume build from state: ${stateMachine.getState()}. ` +
            'Build may already be complete or in a non-resumable state.');
    }
    // Run the build pipeline from the resume point
    return runBuildPipeline(stateMachine, costTracker, outputDir);
}
/**
 * Run the build pipeline from the current state.
 * Internal function used by both buildPresentation and resumeBuild.
 */
async function runBuildPipeline(stateMachine, costTracker, outputDir) {
    try {
        // Determine starting state
        const currentState = stateMachine.getState();
        const resumeState = stateMachine.getResumeState();
        // If we're resuming from a failed state, go back to the resume point
        if (currentState === 'failed' && resumeState) {
            // Reset to resume state (this is handled by starting from the appropriate step)
        }
        // Execute pipeline stages
        await executePipelineStages(stateMachine, costTracker, outputDir);
        return stateMachine.getManifest();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await stateMachine.fail(errorMessage);
        throw error;
    }
}
/**
 * Execute pipeline stages based on current state.
 */
async function executePipelineStages(stateMachine, _costTracker, outputDir) {
    const manifest = stateMachine.getManifest();
    let currentState = manifest.state;
    // If failed, try to resume from last successful state
    if (currentState === 'failed' && manifest.lastSuccessfulState) {
        currentState = manifest.lastSuccessfulState;
    }
    // State: init -> parsing
    if (currentState === 'init') {
        await stateMachine.transitionTo('parsing');
        await executeParsing(stateMachine, outputDir);
        currentState = 'parsing';
    }
    // State: parsing -> generating_audio
    if (currentState === 'parsing') {
        await stateMachine.transitionTo('generating_audio');
        await executeAudioGeneration(stateMachine, outputDir);
        currentState = 'generating_audio';
    }
    // State: generating_audio -> building_timeline
    if (currentState === 'generating_audio') {
        await stateMachine.transitionTo('building_timeline');
        await executeTimelineBuilding(stateMachine, outputDir);
        currentState = 'building_timeline';
    }
    // Determine next state based on requested outputs
    const nextState = stateMachine.getNextState();
    // State: building_timeline -> rendering_*
    if (currentState === 'building_timeline' && nextState) {
        await executeRenderingStages(stateMachine, outputDir);
    }
    // Mark complete if not already
    if (stateMachine.getState() !== 'complete' && stateMachine.getState() !== 'failed') {
        await stateMachine.transitionTo('complete');
    }
}
/**
 * Execute parsing stage.
 * TODO: Integrate with actual parser when available.
 */
async function executeParsing(stateMachine, _outputDir) {
    const manifest = stateMachine.getManifest();
    // TODO: Import and call the talk-track parser
    // const { parseTalkTrack } = await import('../parsers/talk-track.js');
    // const result = await parseTalkTrack(manifest.source.talkTrack);
    // For now, just validate the source file exists
    await readFile(manifest.source.talkTrack, 'utf-8');
    // Update manifest with parsed images
    // TODO: Extract image paths from parsed talk track
    // await stateMachine.updateAssets({ images: parsedImages });
}
/**
 * Execute audio generation stage.
 * TODO: Integrate with actual audio generator when available.
 */
async function executeAudioGeneration(stateMachine, outputDir) {
    const manifest = stateMachine.getManifest();
    const audioDir = join(outputDir, 'audio');
    await mkdir(audioDir, { recursive: true });
    // TODO: Import and call the audio generator
    // const { generateAudio } = await import('../generators/audio/index.js');
    // const audioManifest = await generateAudio(parsedContent, {
    //   provider: manifest.audioProvider,
    //   voice: manifest.voice,
    //   outputDir: audioDir,
    // });
    // Track costs based on provider
    // if (manifest.audioProvider === 'elevenlabs') {
    //   await costTracker.trackElevenLabsUsage(audioManifest.totalCharacters);
    // } else {
    //   await costTracker.trackKokoroUsage(audioManifest.totalCharacters);
    // }
    // Update manifest with audio paths
    // await stateMachine.updateAssets({ audio: audioPaths });
    // Placeholder: manifest the audio directory
    void manifest.audioProvider;
    void manifest.voice;
}
/**
 * Execute timeline building stage.
 * TODO: Integrate with actual timeline builder when available.
 */
async function executeTimelineBuilding(stateMachine, outputDir) {
    // TODO: Import and call the timeline builder
    // const { buildTimeline } = await import('../generators/timeline/index.js');
    // const timeline = await buildTimeline(parsedContent, audioManifest);
    const timelinePath = join(outputDir, 'timeline.json');
    // TODO: Write timeline to disk
    // await writeFile(timelinePath, JSON.stringify(timeline, null, 2));
    await stateMachine.updateOutputs({ timeline: timelinePath });
}
/**
 * Execute rendering stages (html, video, notes).
 */
async function executeRenderingStages(stateMachine, outputDir) {
    const manifest = stateMachine.getManifest();
    // Render HTML if requested
    if (manifest.requestedOutputs.includes('html')) {
        if (stateMachine.canTransitionTo('rendering_html')) {
            await stateMachine.transitionTo('rendering_html');
            await executeHtmlRendering(stateMachine, outputDir);
        }
    }
    // Render video if requested
    if (manifest.requestedOutputs.includes('video')) {
        if (stateMachine.canTransitionTo('rendering_video')) {
            await stateMachine.transitionTo('rendering_video');
            await executeVideoRendering(stateMachine, outputDir);
        }
    }
    // Render notes if requested
    if (manifest.requestedOutputs.includes('notes')) {
        if (stateMachine.canTransitionTo('rendering_notes')) {
            await stateMachine.transitionTo('rendering_notes');
            await executeNotesRendering(stateMachine, outputDir);
        }
    }
}
/**
 * Execute HTML rendering stage.
 * TODO: Integrate with actual HTML renderer when available.
 */
async function executeHtmlRendering(stateMachine, outputDir) {
    // TODO: Import and call the HTML renderer
    // const { renderHtml } = await import('../renderers/html/index.js');
    // await renderHtml(timeline, { outputDir });
    const htmlPath = join(outputDir, 'presentation.html');
    await stateMachine.updateOutputs({ html: htmlPath });
}
/**
 * Execute video rendering stage.
 * TODO: Integrate with actual video renderer when available.
 */
async function executeVideoRendering(stateMachine, outputDir) {
    const manifest = stateMachine.getManifest();
    // TODO: Import and call the Remotion renderer
    // const { renderVideo } = await import('../renderers/remotion/index.js');
    // const renderResult = await renderVideo(timeline, {
    //   quality: manifest.videoQuality || '1080p',
    //   outputDir,
    // });
    // Track Remotion render costs
    // await costTracker.trackRemotionRender(renderResult.renderTimeSeconds);
    const videoPath = join(outputDir, 'presentation.mp4');
    await stateMachine.updateOutputs({ video: videoPath });
    // Placeholder
    void manifest.videoQuality;
}
/**
 * Execute notes rendering stage.
 * TODO: Integrate with actual notes renderer when available.
 */
async function executeNotesRendering(stateMachine, outputDir) {
    // TODO: Import and call the notes renderer
    // const { renderNotes } = await import('../renderers/notes/index.js');
    // await renderNotes(parsedContent, { outputDir });
    const notesPath = join(outputDir, 'speaker-notes.md');
    await stateMachine.updateOutputs({ notes: notesPath });
}
//# sourceMappingURL=index.js.map