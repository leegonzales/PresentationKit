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
 * import { parseTalkTrack, buildPresentation, TalkTrackParseError } from '@leegonzales/presentation-kit';
 *
 * try {
 *   const talkTrack = parseTalkTrack(markdownContent);
 *   await buildPresentation('./talk-track.md', {
 *     outputs: ['html', 'video', 'notes'],
 *     audioProvider: 'kokoro',
 *     voice: 'af_heart',
 *     outputDir: './output',
 *   });
 * } catch (e) {
 *   if (e instanceof TalkTrackParseError) {
 *     console.error('Parse errors:', e.errors);
 *   }
 * }
 * ```
 */

// Parsers
export {
  parseTalkTrack,
  safeParseTalkTrack,
  validateTalkTrack,
  stripSemanticTags,
  TalkTrackParseError,
} from './parsers/index.js';
export type {
  TalkTrackV5,
  Section,
  SlideDefinition,
  SlideContent,
  SemanticTag,
  SemanticTagType,
  BrandConfig,
  ParseResult,
} from './parsers/index.js';

// Audio Generators
export {
  generateKokoroAudio,
  getKokoroVoices,
  parsePauseMarkers,
  KOKORO_VOICES,
  generateElevenLabsAudio,
  getElevenLabsVoices,
} from './generators/audio/index.js';
export type {
  AudioProvider,
  AudioGeneratorOptions,
  AudioResult,
  AudioResultWithTimings,
  AudioManifest,
  AudioManifestWithTimings,
  WordTiming,
  KokoroVoice,
  KokoroOptions,
  ElevenLabsOptions,
} from './generators/audio/index.js';

// Timeline
export {
  buildTimeline,
  calculateTotalFrames,
  getSlideAtTime,
  getSlideAtFrame,
  getCaptionAtTime,
  formatDuration,
  summarizeTimeline,
  TimelineBuildError,
  splitIntoSentences,
  alignCaptionsToAudio,
  estimateCaptionTimings,
  scaleCaptionsToAudioDuration,
} from './generators/timeline/index.js';
export type {
  Timeline,
  TimelineSlide,
  Caption,
  TimelineOptions,
} from './generators/timeline/index.js';

// HTML Renderer
export {
  renderHtmlPresentation,
  renderHtmlPresentationToString,
  getHtmlPresentationSummary,
} from './renderers/html/index.js';
export type { HtmlOptions } from './renderers/html/types.js';

// Speaker Notes Renderer
export {
  renderSpeakerNotes,
  renderSpeakerNotesToString,
  getSpeakerNotesSummary,
} from './renderers/notes/index.js';
export type { NotesOptions } from './renderers/notes/types.js';

// Video Renderer
export {
  renderVideo,
  renderVideoWithPreset,
  estimateRenderTime,
  VideoRenderError,
} from './renderers/remotion/renderer.js';
export type {
  VideoRenderOptions,
  VideoRenderResult,
  VideoCodec,
} from './renderers/remotion/types.js';

// Orchestrator
export {
  buildPresentation,
  resumeBuild,
  BuildStateMachine,
  CostTracker,
  aggregateCosts,
  formatCostSummary,
} from './orchestrator/index.js';
export type {
  BuildState,
  BuildManifest,
  BuildOptions,
  CostEntry,
  CostSummary,
  OutputFormat,
  VideoQuality,
  BuildProgress,
} from './orchestrator/index.js';
