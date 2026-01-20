/**
 * Transition Component
 *
 * Provides configurable transition effects between slides.
 * Supports fade, crossfade, and no-transition modes.
 */
import { type FC, type ReactNode } from 'react';
import type { TransitionProps } from '../types.js';
/**
 * Fade transition wrapper.
 * Fades the child content in or out based on progress.
 */
interface FadeTransitionProps {
    /** Content to apply the fade to */
    children: ReactNode;
    /** Transition progress (0-1) */
    progress: number;
    /** Direction of fade ('in' or 'out') */
    direction: 'in' | 'out';
}
declare const FadeTransition: FC<FadeTransitionProps>;
/**
 * Crossfade transition component.
 * Smoothly crossfades between outgoing and incoming content.
 */
interface CrossfadeTransitionProps {
    /** Content that is fading out */
    outgoing: ReactNode;
    /** Content that is fading in */
    incoming: ReactNode;
    /** Transition progress (0-1, where 0=fully outgoing, 1=fully incoming) */
    progress: number;
}
declare const CrossfadeTransition: FC<CrossfadeTransitionProps>;
/**
 * Generic Transition component.
 * Wraps content with the specified transition effect.
 */
interface TransitionWrapperProps {
    /** Transition configuration */
    transition: TransitionProps;
    /** Content to render with transition */
    children: ReactNode;
    /** Whether this is the entry (fade in) or exit (fade out) */
    isEntry?: boolean;
}
export declare const TransitionWrapper: FC<TransitionWrapperProps>;
/**
 * Hook to calculate transition progress based on frame timing.
 * Returns a TransitionProps object ready for use with transition components.
 */
interface UseTransitionOptions {
    /** Total duration of the content in frames */
    durationInFrames: number;
    /** Transition type */
    type?: 'fade' | 'crossfade' | 'none';
    /** Transition duration in seconds */
    transitionDuration?: number;
}
interface TransitionState {
    /** Whether currently in entry transition */
    isEntering: boolean;
    /** Whether currently in exit transition */
    isExiting: boolean;
    /** Entry transition progress (0-1) */
    entryProgress: number;
    /** Exit transition progress (0-1) */
    exitProgress: number;
    /** Combined opacity for simple fade effects */
    opacity: number;
}
export declare const useTransition: ({ durationInFrames, type, transitionDuration, }: UseTransitionOptions) => TransitionState;
/**
 * SlideTransition Component
 *
 * High-level component for managing slide transitions.
 * Automatically handles entry/exit animations based on frame position.
 */
interface SlideTransitionProps {
    /** Slide content to render */
    children: ReactNode;
    /** Total slide duration in frames */
    durationInFrames: number;
    /** Transition type */
    type?: 'fade' | 'crossfade' | 'none';
    /** Transition duration in seconds */
    transitionDuration?: number;
}
export declare const SlideTransition: FC<SlideTransitionProps>;
export { FadeTransition, CrossfadeTransition };
export default SlideTransition;
//# sourceMappingURL=Transition.d.ts.map