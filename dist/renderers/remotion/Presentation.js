import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Presentation Composition
 *
 * Main Remotion composition for rendering presentation videos.
 * Maps timeline data to slide sequences with synchronized audio and captions.
 */
import { useMemo } from 'react';
import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig, staticFile, } from 'remotion';
import { DEFAULT_TRANSITION_DURATION } from './types.js';
import { Slide } from './components/Slide.js';
import { CaptionOverlay } from './components/CaptionOverlay.js';
import { SlideTransition } from './components/Transition.js';
const ProgressBar = ({ progress, sectionColor = '#ffffff' }) => {
    return (_jsx("div", { style: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
        }, children: _jsx("div", { style: {
                height: '100%',
                width: `${progress * 100}%`,
                backgroundColor: sectionColor,
                boxShadow: `0 0 10px ${sectionColor}80`,
                transition: 'width 0.1s linear',
            } }) }));
};
const SlideIndicator = ({ current, total }) => {
    return (_jsxs("div", { style: {
            position: 'absolute',
            top: 20,
            right: 30,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 18,
            color: 'rgba(255, 255, 255, 0.6)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '8px 16px',
            borderRadius: 6,
            fontWeight: 500,
        }, children: [current, " / ", total] }));
};
/**
 * Format seconds to MM:SS display format.
 */
const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};
const TimeDisplay = ({ currentTime, totalDuration }) => {
    return (_jsxs("div", { style: {
            position: 'absolute',
            bottom: 20,
            left: 30,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 16,
            color: 'rgba(255, 255, 255, 0.6)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '6px 12px',
            borderRadius: 6,
            fontWeight: 500,
        }, children: [formatTime(currentTime), " / ", formatTime(totalDuration)] }));
};
const SlideSequence = ({ slide, assetsPath, durationInFrames, slideIndex, totalSlides, }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    // Calculate current time relative to slide start (in seconds)
    const currentTime = frame / fps;
    return (_jsx(AbsoluteFill, { children: _jsxs(SlideTransition, { durationInFrames: durationInFrames, type: "fade", transitionDuration: DEFAULT_TRANSITION_DURATION, children: [_jsx(Slide, { slide: slide, assetsPath: assetsPath, isActive: true }), slide.audioPath && (_jsx(Audio, { src: staticFile(slide.audioPath) })), _jsx(CaptionOverlay, { captions: slide.captions, currentTime: currentTime, showWordHighlight: true }), _jsx(SlideIndicator, { current: slideIndex + 1, total: totalSlides })] }) }));
};
/**
 * Main Presentation Composition
 *
 * Renders the complete presentation video by:
 * 1. Mapping timeline slides to Remotion sequences
 * 2. Handling audio playback synchronization
 * 3. Rendering captions over slides
 * 4. Managing slide transitions
 */
export const Presentation = ({ timeline, assetsPath }) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    // Current playback time in seconds
    const currentTime = frame / fps;
    // Find the current slide based on time
    const currentSlide = useMemo(() => {
        return timeline.slides.find((slide) => currentTime >= slide.startTime && currentTime < slide.endTime);
    }, [timeline.slides, currentTime]);
    // Current slide index for progress calculation
    const currentSlideIndex = currentSlide
        ? timeline.slides.findIndex((s) => s.slug === currentSlide.slug)
        : 0;
    // Calculate overall progress
    const progress = currentTime / timeline.totalDuration;
    return (_jsxs(AbsoluteFill, { style: { backgroundColor: '#000' }, children: [timeline.slides.map((slide, index) => {
                // Convert slide timing to frames
                const startFrame = Math.floor(slide.startTime * fps);
                const slideFrames = Math.floor(slide.duration * fps);
                return (_jsx(Sequence, { from: startFrame, durationInFrames: slideFrames, children: _jsx(SlideSequence, { slide: slide, assetsPath: assetsPath, durationInFrames: slideFrames, slideIndex: index, totalSlides: timeline.slides.length }) }, slide.slug));
            }), _jsx(ProgressBar, { progress: progress, sectionColor: currentSlide?.sectionColor || '#ffffff' }), _jsx(TimeDisplay, { currentTime: currentTime, totalDuration: timeline.totalDuration })] }));
};
export const PresentationWithAudioTrack = ({ timeline, assetsPath, audioTrackPath, }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const currentTime = frame / fps;
    const currentSlide = useMemo(() => {
        return timeline.slides.find((slide) => currentTime >= slide.startTime && currentTime < slide.endTime);
    }, [timeline.slides, currentTime]);
    const progress = currentTime / timeline.totalDuration;
    return (_jsxs(AbsoluteFill, { style: { backgroundColor: '#000' }, children: [_jsx(Audio, { src: staticFile(audioTrackPath) }), timeline.slides.map((slide, index) => {
                const startFrame = Math.floor(slide.startTime * fps);
                const slideFrames = Math.floor(slide.duration * fps);
                // Calculate caption time relative to absolute time, not slide start
                const captionCurrentTime = currentTime - slide.startTime;
                return (_jsx(Sequence, { from: startFrame, durationInFrames: slideFrames, children: _jsx(AbsoluteFill, { children: _jsxs(SlideTransition, { durationInFrames: slideFrames, type: "fade", transitionDuration: DEFAULT_TRANSITION_DURATION, children: [_jsx(Slide, { slide: slide, assetsPath: assetsPath, isActive: true }), _jsx(CaptionOverlay, { captions: slide.captions, currentTime: Math.max(0, captionCurrentTime), showWordHighlight: true }), _jsx(SlideIndicator, { current: index + 1, total: timeline.slides.length })] }) }) }, slide.slug));
            }), _jsx(ProgressBar, { progress: progress, sectionColor: currentSlide?.sectionColor || '#ffffff' }), _jsx(TimeDisplay, { currentTime: currentTime, totalDuration: timeline.totalDuration })] }));
};
export default Presentation;
//# sourceMappingURL=Presentation.js.map