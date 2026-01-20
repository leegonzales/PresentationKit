import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Composition, AbsoluteFill, Audio, Img, Sequence, useCurrentFrame, useVideoConfig, interpolate, } from 'remotion';
import { readFileSync } from 'node:fs';
/**
 * Loads timeline from the props file path.
 */
function loadTimelineFromProps(propsPath) {
    const content = readFileSync(propsPath, 'utf-8');
    return JSON.parse(content);
}
/**
 * Caption display component with fade animations.
 */
const CaptionDisplay = ({ slide, relativeFrame, fps }) => {
    const relativeTime = relativeFrame / fps;
    // Find active caption
    const activeCaption = slide.captions.find((caption) => relativeTime >= caption.startTime && relativeTime < caption.endTime);
    if (!activeCaption) {
        return null;
    }
    // Calculate fade in/out
    const captionDuration = activeCaption.endTime - activeCaption.startTime;
    const fadeInDuration = Math.min(0.2, captionDuration * 0.2);
    const fadeOutDuration = Math.min(0.2, captionDuration * 0.2);
    const timeInCaption = relativeTime - activeCaption.startTime;
    const timeToEnd = activeCaption.endTime - relativeTime;
    let opacity = 1;
    if (timeInCaption < fadeInDuration) {
        opacity = timeInCaption / fadeInDuration;
    }
    else if (timeToEnd < fadeOutDuration) {
        opacity = timeToEnd / fadeOutDuration;
    }
    return (_jsx("div", { style: {
            position: 'absolute',
            bottom: '10%',
            left: '5%',
            right: '5%',
            textAlign: 'center',
            opacity,
        }, children: _jsx("div", { style: {
                display: 'inline-block',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                padding: '16px 32px',
                borderRadius: '8px',
            }, children: _jsx("span", { style: {
                    color: 'white',
                    fontSize: '32px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: 500,
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                }, children: activeCaption.text }) }) }));
};
/**
 * Individual slide component.
 */
const SlideComponent = ({ slide, assetsPath, fps }) => {
    const frame = useCurrentFrame();
    const durationInFrames = Math.ceil(slide.duration * fps);
    // Calculate fade transitions
    const fadeInFrames = Math.ceil(0.3 * fps);
    const fadeOutFrames = Math.ceil(0.3 * fps);
    const opacity = interpolate(frame, [0, fadeInFrames, durationInFrames - fadeOutFrames, durationInFrames], [0, 1, 1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    // Resolve paths
    const imagePath = slide.imagePath.startsWith('/')
        ? slide.imagePath
        : `${assetsPath}/${slide.imagePath}`;
    const audioPath = slide.audioPath.startsWith('/')
        ? slide.audioPath
        : `${assetsPath}/${slide.audioPath}`;
    return (_jsxs(AbsoluteFill, { style: { opacity }, children: [_jsx(AbsoluteFill, { style: {
                    backgroundColor: slide.sectionColor || '#1a1a1a',
                } }), _jsx(AbsoluteFill, { style: {
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }, children: _jsx(Img, { src: imagePath, style: {
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                    } }) }), _jsx(Audio, { src: audioPath }), _jsx(CaptionDisplay, { slide: slide, relativeFrame: frame, fps: fps })] }));
};
/**
 * Main presentation composition.
 */
const Presentation = ({ timelinePath, assetsPath }) => {
    // Load timeline data
    const { timeline, assetsPath: resolvedAssetsPath } = loadTimelineFromProps(timelinePath);
    const { fps } = useVideoConfig();
    return (_jsx(AbsoluteFill, { style: { backgroundColor: '#000' }, children: timeline.slides.map((slide) => {
            const startFrame = Math.floor(slide.startTime * fps);
            const durationInFrames = Math.ceil(slide.duration * fps);
            return (_jsx(Sequence, { from: startFrame, durationInFrames: durationInFrames, name: slide.title, children: _jsx(SlideComponent, { slide: slide, assetsPath: resolvedAssetsPath || assetsPath, fps: fps }) }, slide.slug));
        }) }));
};
/**
 * Root component that registers the composition with Remotion.
 */
export const RemotionRoot = () => {
    return (_jsx(_Fragment, { children: _jsx(Composition, { id: "Presentation", 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            component: Presentation, durationInFrames: 300, fps: 30, width: 1920, height: 1080, defaultProps: {
                timelinePath: '',
                assetsPath: '',
            } }) }));
};
// Default export for Remotion entry point
export default RemotionRoot;
//# sourceMappingURL=composition.js.map