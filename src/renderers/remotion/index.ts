/**
 * Remotion Video Renderer
 *
 * Exports for video rendering functionality using Remotion.
 * Includes compositions, components, and render functions.
 */

// Main render functions
export {
  renderVideo,
  renderVideoWithPreset,
  estimateRenderTime,
  VideoRenderError,
} from './renderer.js';

// Composition components
export { Presentation, PresentationWithAudioTrack } from './Presentation.js';
export { RemotionRoot } from './Root.js';

// UI Components
export { Slide, SlideWithTitle } from './components/Slide.js';
export { CaptionOverlay, CompactCaptionOverlay } from './components/CaptionOverlay.js';
export {
  SlideTransition,
  TransitionWrapper,
  FadeTransition,
  CrossfadeTransition,
  useTransition,
} from './components/Transition.js';

// Types - Render configuration
export type {
  VideoRenderOptions,
  VideoRenderResult,
  VideoQuality,
  VideoCodec,
  Resolution,
  CompositionProps,
  BundleOptions,
} from './types.js';

// Types - Composition components
export type {
  PresentationProps,
  SlideProps,
  CaptionOverlayProps,
  TransitionProps,
  VideoConfig,
  SectionColors,
  SectionIndicatorProps,
  WordHighlightState,
  CaptionConfig,
  Timeline,
  TimelineSlide,
  Caption,
  WordTiming,
} from './types.js';

// Constants
export {
  QUALITY_PRESETS,
  CODEC_MAP,
  DEFAULT_CAPTION_CONFIG,
  DEFAULT_TRANSITION_DURATION,
  DEFAULT_VIDEO_CONFIG,
} from './types.js';
