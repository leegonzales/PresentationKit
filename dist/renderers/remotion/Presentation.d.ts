/**
 * Presentation Composition
 *
 * Main Remotion composition for rendering presentation videos.
 * Maps timeline data to slide sequences with synchronized audio and captions.
 */
import { type FC } from 'react';
import type { PresentationProps } from './types.js';
/**
 * Main Presentation Composition
 *
 * Renders the complete presentation video by:
 * 1. Mapping timeline slides to Remotion sequences
 * 2. Handling audio playback synchronization
 * 3. Rendering captions over slides
 * 4. Managing slide transitions
 */
export declare const Presentation: FC<PresentationProps>;
/**
 * Presentation composition with concatenated audio track.
 *
 * Alternative composition that uses a single concatenated audio file
 * instead of per-slide audio. This is useful when slides have been
 * combined into a single audio track.
 */
interface PresentationWithAudioTrackProps extends PresentationProps {
    /** Path to the concatenated audio file */
    audioTrackPath: string;
}
export declare const PresentationWithAudioTrack: FC<PresentationWithAudioTrackProps>;
export default Presentation;
//# sourceMappingURL=Presentation.d.ts.map