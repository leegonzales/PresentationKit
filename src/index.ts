/**
 * PresentationKit - Unified Presentation Infrastructure
 * 
 * Transform Talk Track v5 documents into multiple output formats:
 * - Interactive HTML presentations
 * - YouTube-ready videos (via Remotion)
 * - Printable speaker notes
 * 
 * @example
 * ```typescript
 * import { parseTalkTrack, buildPresentation } from '@leegonzales/presentation-kit';
 * 
 * const talkTrack = parseTalkTrack(markdownContent);
 * await buildPresentation('./talk-track.md', {
 *   outputs: ['html', 'video', 'notes'],
 *   audioProvider: 'kokoro',
 *   voice: 'af_heart',
 *   outputDir: './output',
 * });
 * ```
 */

// Parsers
export { parseTalkTrack, safeParseTalkTrack, validateTalkTrack, stripSemanticTags } from './parsers/index.js';
export type { TalkTrackV5, Section, SlideDefinition, SlideContent, SemanticTag, BrandConfig } from './parsers/types.js';

// Audio Generators
export { generateKokoroAudio, getKokoroVoices, parsePauseMarkers, KOKORO_VOICES } from './generators/audio/index.js';
export { generateElevenLabsAudio, getElevenLabsVoices } from './generators/audio/index.js';
export type { AudioGeneratorOptions, AudioResult, AudioManifest, KokoroOptions, ElevenLabsOptions, WordTiming } from './generators/audio/types.js';

// Timeline
export { buildTimeline, calculateTotalFrames, getSlideAtTime, formatDuration, summarizeTimeline } from './generators/timeline/index.js';
export { splitIntoSentences, alignCaptionsToAudio, estimateCaptionTimings } from './generators/timeline/caption-sync.js';
export type { Timeline, TimelineSlide, Caption } from './generators/timeline/types.js';

// HTML Renderer
export { renderHtmlPresentation, renderHtmlPresentationToString, getHtmlPresentationSummary } from './renderers/html/index.js';
export type { HtmlOptions } from './renderers/html/types.js';

// Speaker Notes Renderer
export { renderSpeakerNotes, renderSpeakerNotesToString, getSpeakerNotesSummary } from './renderers/notes/index.js';
export type { NotesOptions } from './renderers/notes/types.js';

// Video Renderer
export { renderVideo, renderVideoWithPreset, estimateRenderTime } from './renderers/remotion/renderer.js';
export type { VideoRenderOptions, VideoRenderResult, VideoQuality, VideoCodec } from './renderers/remotion/types.js';

// Orchestrator
export { buildPresentation, resumeBuild } from './orchestrator/index.js';
export { BuildStateMachine } from './orchestrator/state-machine.js';
export { CostTracker, aggregateCosts, formatCostSummary } from './orchestrator/cost-tracker.js';
export type { BuildState, BuildManifest, BuildOptions, CostEntry } from './orchestrator/types.js';
