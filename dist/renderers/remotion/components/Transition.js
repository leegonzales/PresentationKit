import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { DEFAULT_TRANSITION_DURATION } from '../types.js';
const FadeTransition = ({ children, progress, direction }) => {
    const opacity = direction === 'in' ? progress : 1 - progress;
    return (_jsx(AbsoluteFill, { style: { opacity }, children: children }));
};
const CrossfadeTransition = ({ outgoing, incoming, progress, }) => {
    return (_jsxs(_Fragment, { children: [_jsx(AbsoluteFill, { style: { opacity: 1 - progress }, children: outgoing }), _jsx(AbsoluteFill, { style: { opacity: progress }, children: incoming })] }));
};
export const TransitionWrapper = ({ transition, children, isEntry = true, }) => {
    const { type, progress } = transition;
    if (type === 'none') {
        return _jsx(AbsoluteFill, { children: children });
    }
    if (type === 'fade') {
        return (_jsx(FadeTransition, { progress: progress, direction: isEntry ? 'in' : 'out', children: children }));
    }
    // For crossfade, the component should be used with CrossfadeTransition directly
    // This wrapper handles single-element fades
    return (_jsx(FadeTransition, { progress: progress, direction: isEntry ? 'in' : 'out', children: children }));
};
export const useTransition = ({ durationInFrames, type = 'fade', transitionDuration = DEFAULT_TRANSITION_DURATION, }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const transitionFrames = Math.floor(transitionDuration * fps);
    // Entry transition (fade in at start)
    const isEntering = frame < transitionFrames;
    const entryProgress = isEntering
        ? spring({
            frame,
            fps,
            config: { damping: 200, mass: 0.5 },
        })
        : 1;
    // Exit transition (fade out at end)
    const framesUntilEnd = durationInFrames - frame;
    const isExiting = framesUntilEnd < transitionFrames;
    const exitProgress = isExiting
        ? spring({
            frame: Math.max(0, framesUntilEnd),
            fps,
            config: { damping: 200, mass: 0.5 },
        })
        : 1;
    // Combined opacity for simple cases
    const opacity = type === 'none' ? 1 : Math.min(entryProgress, exitProgress);
    return {
        isEntering,
        isExiting,
        entryProgress,
        exitProgress,
        opacity,
    };
};
export const SlideTransition = ({ children, durationInFrames, type = 'fade', transitionDuration = DEFAULT_TRANSITION_DURATION, }) => {
    const { opacity } = useTransition({
        durationInFrames,
        type,
        transitionDuration,
    });
    return (_jsx(AbsoluteFill, { style: { opacity }, children: children }));
};
// Export individual transition components for advanced use
export { FadeTransition, CrossfadeTransition };
export default SlideTransition;
//# sourceMappingURL=Transition.js.map