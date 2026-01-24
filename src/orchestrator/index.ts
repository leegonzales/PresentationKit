/**
 * Orchestrator
 *
 * Main entry point for the presentation build pipeline.
 * Coordinates parsing, audio generation, timeline building, and rendering.
 */

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { nanoid } from 'nanoid';

import type {
  BuildManifest,
  BuildOptions,
  BuildState,
} from './types.js';
import { BuildStateMachine } from './state-machine.js';
import { CostTracker, aggregateCosts, formatCostSummary } from './cost-tracker.js';

// Parser imports
import { parseTalkTrack } from '../parsers/talk-track.js';
import type { TalkTrackV5 } from '../parsers/types.js';

// Audio generator imports
import { generateKokoroAudio } from '../generators/audio/kokoro.js';
import type { AudioManifest as KokoroAudioManifest } from '../generators/audio/types.js';

// Timeline builder imports
import { buildTimeline } from '../generators/timeline/index.js';
import type { Timeline, AudioManifest as TimelineAudioManifest, AudioManifestEntry } from '../generators/timeline/types.js';

// Renderer imports
import { renderHtmlPresentation } from '../renderers/html/index.js';
import { renderSpeakerNotes } from '../renderers/notes/index.js';
import { renderVideo } from '../renderers/remotion/renderer.js';

// Re-export types and utilities
export * from './types.js';
export { BuildStateMachine } from './state-machine.js';
export { CostTracker, aggregateCosts, formatCostSummary } from './cost-tracker.js';
export type { CostSummary } from './cost-tracker.js';

// -----------------------------------------------------------------------------
// Serialization Helpers
// -----------------------------------------------------------------------------

/**
 * Serializes a TalkTrackV5 object for JSON storage.
 * Converts the slideContent Map to a plain object.
 */
function serializeTalkTrack(talkTrack: TalkTrackV5): object {
  return {
    ...talkTrack,
    slideContent: Object.fromEntries(talkTrack.slideContent),
  };
}

/**
 * Deserializes a TalkTrackV5 object from JSON.
 * Converts the slideContent object back to a Map.
 */
function deserializeTalkTrack(json: unknown): TalkTrackV5 {
  const obj = json as Omit<TalkTrackV5, 'slideContent'> & {
    slideContent: Record<string, TalkTrackV5['slideContent'] extends Map<string, infer V> ? V : never>;
  };
  return {
    ...obj,
    slideContent: new Map(Object.entries(obj.slideContent)),
  } as TalkTrackV5;
}

/**
 * Converts Kokoro AudioManifest format to Timeline AudioManifest format.
 * The timeline builder expects a different structure than what Kokoro produces.
 */
function convertToTimelineAudioManifest(
  kokoroManifest: KokoroAudioManifest,
  voice: string,
): TimelineAudioManifest {
  const entries = new Map<string, AudioManifestEntry>();

  for (const slide of kokoroManifest.slides) {
    entries.set(slide.slideSlug, {
      slug: slide.slideSlug,
      path: slide.audioPath,
      duration: slide.durationSecs,
      provider: 'kokoro',
    });
  }

  return {
    voice,
    provider: 'kokoro',
    entries,
  };
}

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
export async function buildPresentation(
  talkTrackPath: string,
  options: BuildOptions
): Promise<BuildManifest> {
  // Resolve paths
  const absoluteTalkTrackPath = resolve(talkTrackPath);
  const absoluteOutputDir = resolve(options.outputDir);

  // Ensure output directory exists
  await mkdir(absoluteOutputDir, { recursive: true });

  // Read source file and compute hash
  const sourceContent = await readFile(absoluteTalkTrackPath, 'utf-8');
  const sourceHash = createHash('sha256').update(sourceContent).digest('hex').slice(0, 16);

  // Create initial manifest
  const manifest: BuildManifest = {
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
export async function resumeBuild(
  manifestPath: string
): Promise<BuildManifest> {
  const absoluteManifestPath = resolve(manifestPath);
  const outputDir = dirname(absoluteManifestPath);

  // Load existing state machine
  const stateMachine = await BuildStateMachine.fromManifestPath(absoluteManifestPath);
  const costTracker = new CostTracker(stateMachine);

  // Check if we can resume
  const resumeState = stateMachine.getResumeState();
  if (!resumeState) {
    throw new Error(
      `Cannot resume build from state: ${stateMachine.getState()}. ` +
      'Build may already be complete or in a non-resumable state.'
    );
  }

  // Run the build pipeline from the resume point
  return runBuildPipeline(stateMachine, costTracker, outputDir);
}

/**
 * Run the build pipeline from the current state.
 * Internal function used by both buildPresentation and resumeBuild.
 */
async function runBuildPipeline(
  stateMachine: BuildStateMachine,
  costTracker: CostTracker,
  outputDir: string
): Promise<BuildManifest> {
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await stateMachine.fail(errorMessage);
    throw error;
  }
}

/**
 * Execute pipeline stages based on current state.
 */
async function executePipelineStages(
  stateMachine: BuildStateMachine,
  costTracker: CostTracker,
  outputDir: string
): Promise<void> {
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
    await executeAudioGeneration(stateMachine, costTracker, outputDir);
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
    await executeRenderingStages(stateMachine, costTracker, outputDir);
  }

  // Mark complete if not already
  if (stateMachine.getState() !== 'complete' && stateMachine.getState() !== 'failed') {
    await stateMachine.transitionTo('complete');
  }
}

/**
 * Execute parsing stage.
 * Parses the talk track markdown and persists the result for resumption.
 */
async function executeParsing(
  stateMachine: BuildStateMachine,
  outputDir: string
): Promise<void> {
  const manifest = stateMachine.getManifest();

  // Read and parse the talk track
  const sourceContent = await readFile(manifest.source.talkTrack, 'utf-8');
  const talkTrack = parseTalkTrack(sourceContent);

  // Persist parsed data for resumption
  const talkTrackPath = join(outputDir, 'talktrack.json');
  await writeFile(talkTrackPath, JSON.stringify(serializeTalkTrack(talkTrack), null, 2));

  // Extract and update image paths from slide definitions
  const imagePaths = talkTrack.slides
    .map((s) => s.image)
    .filter((img): img is string => !!img);
  await stateMachine.updateAssets({ images: imagePaths });
}

/**
 * Execute audio generation stage.
 * Generates audio using the configured TTS provider and persists the manifest.
 */
async function executeAudioGeneration(
  stateMachine: BuildStateMachine,
  costTracker: CostTracker,
  outputDir: string
): Promise<void> {
  const manifest = stateMachine.getManifest();
  const audioDir = join(outputDir, 'audio');
  await mkdir(audioDir, { recursive: true });

  // Load parsed talk track
  const talkTrackPath = join(outputDir, 'talktrack.json');
  const talkTrackJson = JSON.parse(await readFile(talkTrackPath, 'utf-8'));
  const talkTrack = deserializeTalkTrack(talkTrackJson);

  // Get slides array from the slideContent Map
  const slides = Array.from(talkTrack.slideContent.values());

  // Generate audio based on provider
  let kokoroManifest: KokoroAudioManifest;

  if (manifest.audioProvider === 'kokoro') {
    kokoroManifest = await generateKokoroAudio(slides, {
      outputDir: audioDir,
      voice: manifest.voice,
    });
    costTracker.trackKokoroUsage(kokoroManifest.totalCharacters, 'TTS generation');
  } else {
    // ElevenLabs path (future implementation)
    throw new Error('ElevenLabs audio provider not yet implemented');
  }

  // Persist audio manifest (Kokoro format for storage)
  const audioManifestPath = join(outputDir, 'audio-manifest.json');
  await writeFile(audioManifestPath, JSON.stringify(kokoroManifest, null, 2));

  // Update manifest with audio paths
  const audioPaths = kokoroManifest.slides
    .map((s) => s.audioPath)
    .filter((p): p is string => !!p && p.length > 0);
  await stateMachine.updateAssets({ audio: audioPaths });
}

/**
 * Execute timeline building stage.
 * Builds a synchronized timeline from talk track and audio manifest.
 */
async function executeTimelineBuilding(
  stateMachine: BuildStateMachine,
  outputDir: string
): Promise<void> {
  const manifest = stateMachine.getManifest();

  // Load parsed data
  const talkTrackPath = join(outputDir, 'talktrack.json');
  const audioManifestPath = join(outputDir, 'audio-manifest.json');

  const talkTrackJson = JSON.parse(await readFile(talkTrackPath, 'utf-8'));
  const talkTrack = deserializeTalkTrack(talkTrackJson);

  const kokoroManifest: KokoroAudioManifest = JSON.parse(
    await readFile(audioManifestPath, 'utf-8')
  );

  // Convert Kokoro manifest to Timeline manifest format
  const timelineAudioManifest = convertToTimelineAudioManifest(
    kokoroManifest,
    manifest.voice
  );

  // Build timeline
  const timeline = buildTimeline(talkTrack, timelineAudioManifest);

  // Persist timeline
  const timelinePath = join(outputDir, 'timeline.json');
  await writeFile(timelinePath, JSON.stringify(timeline, null, 2));

  await stateMachine.updateOutputs({ timeline: timelinePath });
}

/**
 * Execute rendering stages (html, video, notes).
 */
async function executeRenderingStages(
  stateMachine: BuildStateMachine,
  costTracker: CostTracker,
  outputDir: string
): Promise<void> {
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
      await executeVideoRendering(stateMachine, costTracker, outputDir);
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
 * Generates an interactive HTML presentation.
 */
async function executeHtmlRendering(
  stateMachine: BuildStateMachine,
  outputDir: string
): Promise<void> {
  // Load data
  const talkTrackPath = join(outputDir, 'talktrack.json');
  const timelinePath = join(outputDir, 'timeline.json');

  const talkTrackJson = JSON.parse(await readFile(talkTrackPath, 'utf-8'));
  const talkTrack = deserializeTalkTrack(talkTrackJson);

  const timeline: Timeline = JSON.parse(await readFile(timelinePath, 'utf-8'));

  // Render HTML
  const htmlPath = join(outputDir, 'presentation.html');
  await renderHtmlPresentation(talkTrack, timeline, htmlPath, {
    primaryColor: talkTrack.branding?.primary,
  });

  await stateMachine.updateOutputs({ html: htmlPath });
}

/**
 * Execute video rendering stage.
 * Renders the presentation timeline to a video file using Remotion.
 */
async function executeVideoRendering(
  stateMachine: BuildStateMachine,
  costTracker: CostTracker,
  outputDir: string
): Promise<void> {
  const manifest = stateMachine.getManifest();

  // Load timeline
  const timelinePath = join(outputDir, 'timeline.json');
  const timeline: Timeline = JSON.parse(await readFile(timelinePath, 'utf-8'));

  // Render video
  const videoPath = join(outputDir, 'presentation.mp4');
  const startTime = Date.now();

  await renderVideo(timeline, outputDir, {
    outputPath: videoPath,
    quality: manifest.videoQuality || '1080p',
    codec: 'h264',
    crf: 23,
  });

  const renderSeconds = (Date.now() - startTime) / 1000;
  costTracker.trackRemotionRender(renderSeconds, 'Video rendering');

  await stateMachine.updateOutputs({ video: videoPath });
}

/**
 * Execute notes rendering stage.
 * Generates printable speaker notes HTML.
 */
async function executeNotesRendering(
  stateMachine: BuildStateMachine,
  outputDir: string
): Promise<void> {
  // Load talk track
  const talkTrackPath = join(outputDir, 'talktrack.json');
  const talkTrackJson = JSON.parse(await readFile(talkTrackPath, 'utf-8'));
  const talkTrack = deserializeTalkTrack(talkTrackJson);

  // Render notes
  const notesPath = join(outputDir, 'speaker-notes.html');
  await renderSpeakerNotes(talkTrack, notesPath);

  await stateMachine.updateOutputs({ notes: notesPath });
}
