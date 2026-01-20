/**
 * Remotion Video Renderer Types
 *
 * Type definitions for video rendering configuration and output.
 */
/**
 * Quality preset definitions.
 */
export const QUALITY_PRESETS = {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '4k': { width: 3840, height: 2160 },
};
/**
 * Codec to Remotion codec mapping.
 */
export const CODEC_MAP = {
    h264: 'h264',
    h265: 'h265',
    vp8: 'vp8',
    vp9: 'vp9',
};
/**
 * Default caption configuration.
 */
export const DEFAULT_CAPTION_CONFIG = {
    fontSize: 42,
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: 16,
    borderRadius: 8,
    bottomOffset: 80,
};
/**
 * Default transition configuration.
 */
export const DEFAULT_TRANSITION_DURATION = 0.3; // seconds
/**
 * Default video configuration.
 */
export const DEFAULT_VIDEO_CONFIG = {
    width: 1920,
    height: 1080,
    fps: 30,
};
//# sourceMappingURL=types.js.map