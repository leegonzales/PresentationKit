/**
 * HTML Presentation Template
 *
 * Generates a self-contained, interactive HTML presentation with:
 * - Full-screen slide display
 * - Keyboard navigation (arrows, space, Page Up/Down)
 * - Speaker notes toggle (N key)
 * - Timer display (T key to toggle)
 * - Progress bar
 * - Audio playback per slide (if audio exists)
 * - Section indicator with color
 * - Slide counter
 * - Touch/swipe support for mobile
 * - Print to PDF support (P key)
 * - Help overlay (H or ? key)
 */

import type { HtmlOptions, PreparedHtmlSlide, PreparedHtmlMetadata, SectionInfo } from './types.js';
import { DEFAULT_HTML_OPTIONS } from './types.js';

/**
 * Escapes HTML special characters for safe rendering.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escapes a string for safe use in JavaScript.
 */
function escapeJs(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Generates CSS styles for the HTML presentation.
 */
function generateStyles(options: Required<HtmlOptions>): string {
  return `
        :root {
            --primary: ${options.primaryColor};
            --bg: ${options.backgroundColor};
            --text: ${options.textColor};
            --control-bg: rgba(30, 30, 30, 0.95);
            --control-border: rgba(255, 255, 255, 0.1);
            --green: #2d5a2d;
            --red: #6b4c4c;
            --warning: #FFC107;
            --overtime: #f44336;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            overflow: hidden;
            height: 100vh;
            user-select: none;
        }

        /* Presentation Container */
        .presentation {
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* Slide Container */
        .slide-container {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 15px 20px 10px;
            position: relative;
        }

        .slide {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 6px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            transition: opacity 0.2s ease;
        }

        .slide.loading {
            opacity: 0.7;
        }

        /* Control Bar */
        .control-bar {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 24px;
            padding: 14px 30px;
            background: var(--control-bg);
            border-top: 1px solid var(--control-border);
            flex-wrap: wrap;
        }

        .control-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .divider {
            width: 1px;
            height: 28px;
            background: rgba(255, 255, 255, 0.15);
        }

        /* Timer */
        .timer {
            font-size: 24px;
            font-weight: 500;
            font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
            color: var(--primary);
            min-width: 70px;
            cursor: pointer;
        }

        .timer.hidden {
            display: none;
        }

        .timer.running {
            color: #4CAF50;
        }

        .timer.warning {
            color: var(--warning);
        }

        .timer.overtime {
            color: var(--overtime);
        }

        .target-time {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
        }

        /* Buttons */
        .btn {
            background: var(--primary);
            color: white;
            border: none;
            padding: 8px 14px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.15s;
        }

        .btn:hover {
            filter: brightness(1.1);
        }

        .btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }

        .btn:active {
            transform: scale(0.98);
        }

        .btn-nav {
            padding: 8px 12px;
            font-size: 14px;
        }

        .btn-start {
            background: var(--green);
            padding: 8px 16px;
            font-weight: 500;
        }

        .btn-start:hover {
            background: #3d6a3d;
        }

        .btn-start.running {
            background: #8b4513;
        }

        .btn-play {
            background: var(--green);
            padding: 8px 14px;
            min-width: 80px;
        }

        .btn-play:hover {
            background: #3d6a3d;
        }

        .btn-play.playing {
            background: #8b4513;
        }

        .btn-play.no-audio {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .btn-reset {
            background: var(--red);
            padding: 8px 12px;
        }

        .btn-reset:hover {
            background: #7d5c5c;
        }

        /* Mode Toggle */
        .mode-btn {
            padding: 4px 8px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.6);
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
            transition: all 0.15s;
        }

        .mode-btn:hover {
            background: rgba(255, 255, 255, 0.15);
        }

        .mode-btn.active {
            background: var(--primary);
            border-color: var(--primary);
            color: white;
        }

        /* Progress */
        .progress {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.7);
        }

        .section-label {
            color: var(--primary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-size: 11px;
            font-weight: 500;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .progress-bar {
            width: 150px;
            height: 4px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: var(--primary);
            transition: width 0.3s;
        }

        .slide-counter {
            font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
            font-size: 12px;
        }

        /* Audio Indicator */
        .audio-indicator {
            display: none;
            align-items: center;
            gap: 4px;
            color: #4CAF50;
            font-size: 10px;
        }

        .audio-indicator.active {
            display: flex;
        }

        .audio-wave {
            display: flex;
            gap: 1px;
            align-items: center;
        }

        .audio-wave span {
            width: 2px;
            background: #4CAF50;
            border-radius: 1px;
            animation: wave 0.5s ease-in-out infinite;
        }

        .audio-wave span:nth-child(1) { height: 6px; animation-delay: 0s; }
        .audio-wave span:nth-child(2) { height: 10px; animation-delay: 0.1s; }
        .audio-wave span:nth-child(3) { height: 14px; animation-delay: 0.2s; }
        .audio-wave span:nth-child(4) { height: 10px; animation-delay: 0.3s; }
        .audio-wave span:nth-child(5) { height: 6px; animation-delay: 0.4s; }

        @keyframes wave {
            0%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(0.5); }
        }

        /* Speaker Notes Overlay */
        .speaker-notes {
            position: fixed;
            bottom: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.95);
            padding: 15px 20px;
            border-radius: 6px;
            max-width: 700px;
            max-height: 200px;
            overflow-y: auto;
            display: none;
            border: 1px solid rgba(255, 255, 255, 0.15);
            z-index: 100;
        }

        .speaker-notes.visible {
            display: block;
        }

        .speaker-notes-header {
            font-size: 10px;
            color: var(--primary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            font-weight: 600;
        }

        .speaker-notes p {
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.5;
            font-size: 13px;
        }

        .speaker-notes .no-notes {
            color: rgba(255, 255, 255, 0.5);
            font-style: italic;
        }

        /* Help Overlay */
        .help-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .help-overlay.visible {
            display: flex;
        }

        .help-content {
            background: #1e1e1e;
            padding: 30px 40px;
            border-radius: 8px;
            max-width: 600px;
            width: 90%;
        }

        .help-content h2 {
            color: var(--primary);
            margin-bottom: 20px;
            font-size: 18px;
        }

        .help-content .close-hint {
            color: rgba(255, 255, 255, 0.5);
            font-size: 11px;
            margin-bottom: 20px;
        }

        .help-section {
            margin-bottom: 20px;
        }

        .help-section h3 {
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }

        .help-grid {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 8px 20px;
            font-size: 13px;
        }

        .help-grid kbd {
            background: rgba(255, 255, 255, 0.1);
            padding: 3px 8px;
            border-radius: 3px;
            font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
            font-size: 11px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .help-grid span {
            color: rgba(255, 255, 255, 0.7);
        }

        /* Print Styles */
        @media print {
            body {
                background: white;
                color: black;
                overflow: visible;
                height: auto;
            }

            .presentation {
                height: auto;
            }

            .control-bar,
            .speaker-notes,
            .help-overlay {
                display: none !important;
            }

            .slide-container {
                padding: 0;
                page-break-after: always;
                height: 100vh;
            }

            .slide {
                max-width: 95%;
                max-height: 95%;
                box-shadow: none;
            }
        }

        /* Touch Device Styles */
        @media (hover: none) and (pointer: coarse) {
            .control-bar {
                padding: 10px 15px;
                gap: 12px;
            }

            .btn {
                padding: 10px 16px;
                font-size: 14px;
            }

            .timer {
                font-size: 20px;
            }

            .divider {
                display: none;
            }
        }

        /* Responsive */
        @media (max-width: 768px) {
            .control-bar {
                gap: 12px;
                padding: 10px 15px;
            }

            .progress-bar {
                width: 80px;
            }

            .target-time {
                display: none;
            }

            .divider {
                display: none;
            }

            .mode-btn {
                display: none;
            }
        }

        /* Loading Indicator */
        .loading-indicator {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: var(--primary);
            font-size: 14px;
            display: none;
        }

        .loading-indicator.visible {
            display: block;
        }

        /* Grid Overview */
        .grid-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.95);
            display: none;
            z-index: 900;
            overflow-y: auto;
            padding: 20px;
        }

        .grid-overlay.visible {
            display: block;
        }

        .grid-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding: 0 10px;
        }

        .grid-header h2 {
            color: var(--primary);
            font-size: 18px;
        }

        .grid-close {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            font-size: 24px;
            cursor: pointer;
            padding: 5px 10px;
        }

        .grid-close:hover {
            color: white;
        }

        .grid-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
            padding-bottom: 20px;
        }

        .grid-item {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.2s;
            border: 2px solid transparent;
        }

        .grid-item:hover {
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-2px);
        }

        .grid-item.current {
            border-color: var(--primary);
        }

        .grid-item img {
            width: 100%;
            aspect-ratio: 16/9;
            object-fit: cover;
        }

        .grid-item-info {
            padding: 10px 12px;
        }

        .grid-item-number {
            font-size: 11px;
            color: var(--primary);
            font-weight: 600;
        }

        .grid-item-title {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.9);
            margin-top: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .grid-item-section {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.5);
            margin-top: 4px;
        }

        /* Talk Track Drawer */
        .drawer {
            position: fixed;
            top: 0;
            right: -400px;
            width: 400px;
            height: 100vh;
            background: var(--control-bg);
            border-left: 1px solid var(--control-border);
            z-index: 800;
            transition: right 0.3s ease;
            display: flex;
            flex-direction: column;
        }

        .drawer.visible {
            right: 0;
        }

        .drawer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid var(--control-border);
        }

        .drawer-header h3 {
            color: var(--primary);
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .drawer-close {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.6);
            font-size: 20px;
            cursor: pointer;
        }

        .drawer-content {
            flex: 1;
            overflow-y: auto;
            padding: 0;
        }

        .drawer-slide {
            padding: 15px 20px;
            border-bottom: 1px solid var(--control-border);
            cursor: pointer;
            transition: background 0.15s;
        }

        .drawer-slide:hover {
            background: rgba(255, 255, 255, 0.05);
        }

        .drawer-slide.current {
            background: rgba(85, 115, 115, 0.2);
            border-left: 3px solid var(--primary);
        }

        .drawer-slide-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
        }

        .drawer-slide-number {
            background: var(--primary);
            color: white;
            font-size: 10px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 3px;
        }

        .drawer-slide-title {
            font-size: 13px;
            font-weight: 500;
            color: white;
        }

        .drawer-slide-text {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.7);
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        /* Thumbnail Filmstrip */
        .filmstrip {
            display: none;
            background: rgba(0, 0, 0, 0.9);
            border-top: 1px solid var(--control-border);
            padding: 10px 15px;
            overflow-x: auto;
            white-space: nowrap;
        }

        .filmstrip.visible {
            display: block;
        }

        .filmstrip-inner {
            display: inline-flex;
            gap: 8px;
        }

        .filmstrip-item {
            flex-shrink: 0;
            width: 120px;
            cursor: pointer;
            border-radius: 4px;
            overflow: hidden;
            border: 2px solid transparent;
            transition: all 0.15s;
            opacity: 0.6;
        }

        .filmstrip-item:hover {
            opacity: 0.9;
        }

        .filmstrip-item.current {
            border-color: var(--primary);
            opacity: 1;
        }

        .filmstrip-item img {
            width: 100%;
            aspect-ratio: 16/9;
            object-fit: cover;
        }

        .filmstrip-item-label {
            background: rgba(0, 0, 0, 0.8);
            padding: 3px 6px;
            font-size: 9px;
            color: rgba(255, 255, 255, 0.8);
            text-align: center;
        }

        /* Section Navigation Panel */
        .section-panel {
            position: fixed;
            left: -300px;
            top: 50%;
            transform: translateY(-50%);
            background: var(--control-bg);
            border: 1px solid var(--control-border);
            border-left: none;
            border-radius: 0 8px 8px 0;
            padding: 15px 20px;
            z-index: 700;
            transition: left 0.3s ease;
        }

        .section-panel.visible {
            left: 0;
        }

        .section-panel h4 {
            color: rgba(255, 255, 255, 0.5);
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        }

        .section-list {
            list-style: none;
        }

        .section-list li {
            margin-bottom: 8px;
        }

        .section-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.15s;
            background: rgba(255, 255, 255, 0.05);
        }

        .section-item:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .section-item.current {
            background: rgba(85, 115, 115, 0.3);
        }

        .section-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }

        .section-name {
            font-size: 13px;
            color: white;
        }

        .section-count {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.5);
            margin-left: auto;
        }

        /* Quick Jump Dialog */
        .jump-dialog {
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background: var(--control-bg);
            border: 1px solid var(--control-border);
            border-radius: 8px;
            width: 500px;
            max-width: 90%;
            z-index: 950;
            display: none;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .jump-dialog.visible {
            display: block;
        }

        .jump-input-wrapper {
            padding: 15px 20px;
            border-bottom: 1px solid var(--control-border);
        }

        .jump-input {
            width: 100%;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            padding: 10px 15px;
            font-size: 16px;
            color: white;
            outline: none;
        }

        .jump-input:focus {
            border-color: var(--primary);
        }

        .jump-input::placeholder {
            color: rgba(255, 255, 255, 0.4);
        }

        .jump-results {
            max-height: 300px;
            overflow-y: auto;
        }

        .jump-result {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 20px;
            cursor: pointer;
            transition: background 0.1s;
        }

        .jump-result:hover,
        .jump-result.selected {
            background: rgba(255, 255, 255, 0.1);
        }

        .jump-result-number {
            font-size: 12px;
            color: var(--primary);
            font-weight: 600;
            min-width: 30px;
        }

        .jump-result-title {
            font-size: 14px;
            color: white;
        }

        .jump-result-section {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.5);
            margin-left: auto;
        }

        .jump-hint {
            padding: 10px 20px;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.4);
            border-top: 1px solid var(--control-border);
        }

        /* Clock Display */
        .clock {
            font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
        }

        /* Adjust presentation when drawer is open */
        .presentation.drawer-open .slide-container {
            margin-right: 400px;
            transition: margin-right 0.3s ease;
        }

        /* Filmstrip adjusts control bar */
        .presentation.filmstrip-open .control-bar {
            border-top: none;
        }
    `;
}

/**
 * Generates the slides JavaScript array.
 */
function generateSlidesJs(slides: PreparedHtmlSlide[]): string {
  const slideEntries = slides.map((slide) => {
    const audioPath = slide.audioPath ? `'${escapeJs(slide.audioPath)}'` : 'null';
    const notes = slide.speakerNotes ? `'${escapeJs(slide.speakerNotes)}'` : 'null';

    return `{
            slug: '${escapeJs(slide.slug)}',
            title: '${escapeJs(slide.title)}',
            image: '${escapeJs(slide.imagePath)}',
            section: '${escapeJs(slide.section)}',
            sectionColor: '${escapeJs(slide.sectionColor)}',
            audio: ${audioPath},
            audioDuration: ${slide.audioDuration},
            notes: ${notes},
            isAppendix: ${slide.isAppendix}
        }`;
  });

  return `[\n${slideEntries.join(',\n')}\n        ]`;
}

/**
 * Generates the sections JavaScript array.
 */
function generateSectionsJs(sections: SectionInfo[]): string {
  const sectionEntries = sections.map((section) => {
    return `{
            id: '${escapeJs(section.id)}',
            name: '${escapeJs(section.name)}',
            color: '${escapeJs(section.color)}',
            startIndex: ${section.startIndex},
            slideCount: ${section.slideCount}
        }`;
  });

  return `[\n${sectionEntries.join(',\n')}\n        ]`;
}

/**
 * Generates embedded JavaScript for presentation interactivity.
 */
function generateScript(
  slides: PreparedHtmlSlide[],
  sections: SectionInfo[],
  metadata: PreparedHtmlMetadata,
  options: Required<HtmlOptions>,
): string {
  const hasAudio = slides.some((s) => s.audioPath !== null);

  return `
        // Presentation Data
        const slides = ${generateSlidesJs(slides)};
        const sections = ${generateSectionsJs(sections)};
        const metadata = {
            title: '${escapeJs(metadata.title)}',
            targetMinutes: ${metadata.targetMinutes},
            totalAudioDuration: ${metadata.totalAudioDuration},
            hasAudio: ${hasAudio}
        };

        // State
        let currentIndex = 0;
        let showNotes = false;
        let showTimer = true;
        let showHelp = false;
        let showGrid = false;
        let showDrawer = false;
        let showFilmstrip = false;
        let showSectionPanel = false;
        let showJumpDialog = false;
        let jumpSelectedIndex = 0;
        let presentationRunning = false;
        let autoAdvance = true;
        let timerInterval = null;
        let elapsedSeconds = 0;

        // DOM Elements
        const slideImg = document.getElementById('currentSlide');
        const timerEl = document.getElementById('timer');
        const targetTimeEl = document.getElementById('targetTime');
        const startBtn = document.getElementById('startBtn');
        const resetBtn = document.getElementById('resetBtn');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const playBtn = document.getElementById('playBtn');
        const sectionLabel = document.getElementById('sectionLabel');
        const progressFill = document.getElementById('progressFill');
        const slideCounter = document.getElementById('slideCounter');
        const audioIndicator = document.getElementById('audioIndicator');
        const speakerNotes = document.getElementById('speakerNotes');
        const notesText = document.getElementById('notesText');
        const helpOverlay = document.getElementById('helpOverlay');
        const modeAuto = document.getElementById('modeAuto');
        const modeManual = document.getElementById('modeManual');
        const audioPlayer = document.getElementById('audioPlayer');
        const gridOverlay = document.getElementById('gridOverlay');
        const drawer = document.getElementById('drawer');
        const filmstrip = document.getElementById('filmstrip');
        const sectionPanel = document.getElementById('sectionPanel');
        const jumpDialog = document.getElementById('jumpDialog');
        const jumpInput = document.getElementById('jumpInput');
        const jumpResults = document.getElementById('jumpResults');
        const clockEl = document.getElementById('clock');
        const presentation = document.querySelector('.presentation');

        // Calculate target time from audio or metadata
        function calculateTargetTime() {
            if (metadata.totalAudioDuration > 0) {
                return Math.round(metadata.totalAudioDuration);
            }
            return metadata.targetMinutes * 60;
        }

        const targetSeconds = calculateTargetTime();

        // Format time as MM:SS
        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
        }

        // Update timer display
        function updateTimer() {
            timerEl.textContent = formatTime(elapsedSeconds);
            timerEl.classList.remove('running', 'warning', 'overtime');

            if (presentationRunning) {
                if (elapsedSeconds > targetSeconds) {
                    timerEl.classList.add('overtime');
                } else if (elapsedSeconds > targetSeconds * 0.9) {
                    timerEl.classList.add('warning');
                } else {
                    timerEl.classList.add('running');
                }
            }
        }

        // Update slide display
        function updateSlide() {
            const slide = slides[currentIndex];

            // Update image with loading state
            slideImg.classList.add('loading');
            slideImg.src = slide.image;
            slideImg.onload = () => slideImg.classList.remove('loading');

            // Update section label with color
            sectionLabel.textContent = slide.section;
            sectionLabel.style.color = slide.sectionColor;
            progressFill.style.background = slide.sectionColor;

            // Update counter
            slideCounter.textContent = (currentIndex + 1) + ' / ' + slides.length;

            // Update progress
            progressFill.style.width = ((currentIndex + 1) / slides.length * 100) + '%';

            // Update navigation buttons
            prevBtn.disabled = currentIndex === 0;
            nextBtn.disabled = currentIndex === slides.length - 1;

            // Update play button state
            if (!slide.audio) {
                playBtn.classList.add('no-audio');
                playBtn.textContent = 'No Audio';
            } else {
                playBtn.classList.remove('no-audio');
                playBtn.classList.remove('playing');
                playBtn.textContent = 'Play';
            }

            // Update speaker notes
            if (slide.notes) {
                notesText.innerHTML = '<p>' + slide.notes.replace(/\\n/g, '</p><p>') + '</p>';
                notesText.classList.remove('no-notes');
            } else {
                notesText.innerHTML = '<p class="no-notes">No speaker notes for this slide.</p>';
            }

            // Reset audio indicator
            audioIndicator.classList.remove('active');

            // Update UI elements if visible
            if (showGrid) updateGridSelection();
            if (showDrawer) {
                updateDrawerSelection();
                scrollDrawerToCurrentSlide();
            }
            if (showFilmstrip) {
                updateFilmstripSelection();
                scrollFilmstripToCurrentSlide();
            }
            if (showSectionPanel) updateSectionPanelSelection();
        }

        // Navigate to next slide
        function nextSlide() {
            if (currentIndex < slides.length - 1) {
                audioPlayer.pause();
                currentIndex++;
                updateSlide();
                if (presentationRunning && autoAdvance && slides[currentIndex].audio) {
                    playCurrentAudio();
                }
            } else if (presentationRunning) {
                stopPresentation();
            }
        }

        // Navigate to previous slide
        function prevSlide() {
            if (currentIndex > 0) {
                audioPlayer.pause();
                currentIndex--;
                updateSlide();
            }
        }

        // Go to specific slide
        function goToSlide(index) {
            if (index >= 0 && index < slides.length) {
                audioPlayer.pause();
                currentIndex = index;
                updateSlide();
            }
        }

        // Toggle speaker notes
        function toggleNotes() {
            showNotes = !showNotes;
            speakerNotes.classList.toggle('visible', showNotes);
        }

        // Toggle timer visibility
        function toggleTimer() {
            showTimer = !showTimer;
            timerEl.classList.toggle('hidden', !showTimer);
            targetTimeEl.style.display = showTimer ? '' : 'none';
        }

        // Toggle help overlay
        function toggleHelp() {
            showHelp = !showHelp;
            helpOverlay.classList.toggle('visible', showHelp);
        }

        // Play current slide audio
        function playCurrentAudio() {
            const slide = slides[currentIndex];
            if (!slide.audio) return;

            audioPlayer.src = slide.audio;
            audioPlayer.play().catch(e => console.log('Audio play failed:', e));
            audioIndicator.classList.add('active');
            playBtn.classList.add('playing');
            playBtn.textContent = 'Pause';
        }

        // Pause audio
        function pauseAudio() {
            audioPlayer.pause();
            audioIndicator.classList.remove('active');
            playBtn.classList.remove('playing');
            playBtn.textContent = 'Play';
        }

        // Toggle audio playback
        function toggleAudio() {
            const slide = slides[currentIndex];
            if (!slide.audio) return;

            if (audioPlayer.paused) {
                playCurrentAudio();
            } else {
                pauseAudio();
            }
        }

        // Start presentation
        function startPresentation() {
            presentationRunning = true;
            startBtn.textContent = 'Stop';
            startBtn.classList.add('running');

            timerInterval = setInterval(() => {
                elapsedSeconds++;
                updateTimer();
            }, 1000);

            updateTimer();

            if (autoAdvance && slides[currentIndex].audio) {
                playCurrentAudio();
            }
        }

        // Stop presentation
        function stopPresentation() {
            presentationRunning = false;
            startBtn.textContent = 'Start';
            startBtn.classList.remove('running');

            clearInterval(timerInterval);
            pauseAudio();
        }

        // Toggle presentation
        function togglePresentation() {
            if (presentationRunning) {
                stopPresentation();
            } else {
                startPresentation();
            }
        }

        // Reset timer and presentation
        function resetTimer() {
            if (presentationRunning) {
                stopPresentation();
            }
            elapsedSeconds = 0;
            updateTimer();
            currentIndex = 0;
            updateSlide();
        }

        // Set playback mode
        function setMode(mode) {
            autoAdvance = (mode === 'auto');
            modeAuto.classList.toggle('active', autoAdvance);
            modeManual.classList.toggle('active', !autoAdvance);
        }

        // Toggle grid overlay
        function toggleGrid() {
            showGrid = !showGrid;
            gridOverlay.classList.toggle('visible', showGrid);
            if (showGrid) {
                updateGridSelection();
            }
        }

        // Update grid current selection
        function updateGridSelection() {
            document.querySelectorAll('.grid-item').forEach((item, idx) => {
                item.classList.toggle('current', idx === currentIndex);
            });
        }

        // Go to slide from grid
        function goToSlideFromGrid(index) {
            goToSlide(index);
            toggleGrid();
        }

        // Toggle drawer
        function toggleDrawer() {
            showDrawer = !showDrawer;
            drawer.classList.toggle('visible', showDrawer);
            presentation.classList.toggle('drawer-open', showDrawer);
            if (showDrawer) {
                updateDrawerSelection();
                scrollDrawerToCurrentSlide();
            }
        }

        // Update drawer current selection
        function updateDrawerSelection() {
            document.querySelectorAll('.drawer-slide').forEach((item, idx) => {
                item.classList.toggle('current', idx === currentIndex);
            });
        }

        // Scroll drawer to current slide
        function scrollDrawerToCurrentSlide() {
            const currentItem = document.querySelector('.drawer-slide.current');
            if (currentItem) {
                currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        // Go to slide from drawer
        function goToSlideFromDrawer(index) {
            goToSlide(index);
            updateDrawerSelection();
        }

        // Toggle filmstrip
        function toggleFilmstrip() {
            showFilmstrip = !showFilmstrip;
            filmstrip.classList.toggle('visible', showFilmstrip);
            presentation.classList.toggle('filmstrip-open', showFilmstrip);
            if (showFilmstrip) {
                updateFilmstripSelection();
                scrollFilmstripToCurrentSlide();
            }
        }

        // Update filmstrip current selection
        function updateFilmstripSelection() {
            document.querySelectorAll('.filmstrip-item').forEach((item, idx) => {
                item.classList.toggle('current', idx === currentIndex);
            });
        }

        // Scroll filmstrip to current slide
        function scrollFilmstripToCurrentSlide() {
            const currentItem = document.querySelector('.filmstrip-item.current');
            if (currentItem) {
                currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }

        // Toggle section panel
        function toggleSectionPanel() {
            showSectionPanel = !showSectionPanel;
            sectionPanel.classList.toggle('visible', showSectionPanel);
            if (showSectionPanel) {
                updateSectionPanelSelection();
            }
        }

        // Update section panel current selection
        function updateSectionPanelSelection() {
            const currentSlide = slides[currentIndex];
            document.querySelectorAll('.section-item').forEach((item) => {
                const sectionIdx = parseInt(item.dataset.section);
                const section = sections[sectionIdx];
                const isInSection = currentIndex >= section.startIndex &&
                                   currentIndex < section.startIndex + section.slideCount;
                item.classList.toggle('current', isInSection);
            });
        }

        // Go to section
        function goToSection(slideIndex) {
            goToSlide(slideIndex);
            updateSectionPanelSelection();
        }

        // Toggle jump dialog
        function toggleJumpDialog() {
            showJumpDialog = !showJumpDialog;
            jumpDialog.classList.toggle('visible', showJumpDialog);
            if (showJumpDialog) {
                jumpInput.value = '';
                jumpInput.focus();
                jumpSelectedIndex = 0;
                updateJumpResults('');
            }
        }

        // Update jump results based on query
        function updateJumpResults(query) {
            const q = query.toLowerCase().trim();
            let results = slides.map((slide, idx) => ({ slide, idx }));

            if (q) {
                // Filter by number or title
                if (/^\\d+$/.test(q)) {
                    const num = parseInt(q);
                    results = results.filter(r => (r.idx + 1).toString().includes(q));
                } else {
                    results = results.filter(r =>
                        r.slide.title.toLowerCase().includes(q) ||
                        r.slide.section.toLowerCase().includes(q)
                    );
                }
            }

            // Limit to 10 results
            results = results.slice(0, 10);

            jumpResults.innerHTML = results.map((r, i) => \`
                <div class="jump-result\${i === jumpSelectedIndex ? ' selected' : ''}"
                     data-index="\${r.idx}"
                     onclick="jumpToSlide(\${r.idx})">
                    <span class="jump-result-number">\${r.idx + 1}</span>
                    <span class="jump-result-title">\${r.slide.title}</span>
                    <span class="jump-result-section">\${r.slide.section}</span>
                </div>
            \`).join('');

            return results;
        }

        // Jump to slide from dialog
        function jumpToSlide(index) {
            goToSlide(index);
            toggleJumpDialog();
        }

        // Handle jump input
        jumpInput.addEventListener('input', (e) => {
            jumpSelectedIndex = 0;
            updateJumpResults(e.target.value);
        });

        // Handle jump keyboard navigation
        jumpInput.addEventListener('keydown', (e) => {
            const results = document.querySelectorAll('.jump-result');

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    jumpSelectedIndex = Math.min(jumpSelectedIndex + 1, results.length - 1);
                    updateJumpSelection();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    jumpSelectedIndex = Math.max(jumpSelectedIndex - 1, 0);
                    updateJumpSelection();
                    break;
                case 'Enter':
                    e.preventDefault();
                    const selected = results[jumpSelectedIndex];
                    if (selected) {
                        jumpToSlide(parseInt(selected.dataset.index));
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    toggleJumpDialog();
                    break;
            }
        });

        // Update jump selection visual
        function updateJumpSelection() {
            document.querySelectorAll('.jump-result').forEach((item, i) => {
                item.classList.toggle('selected', i === jumpSelectedIndex);
            });
        }

        // Clock update
        function updateClock() {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const mins = now.getMinutes().toString().padStart(2, '0');
            clockEl.textContent = hours + ':' + mins;
        }

        // Start clock
        setInterval(updateClock, 1000);
        updateClock();

        // Print presentation
        function printPresentation() {
            window.print();
        }

        // Audio ended handler
        audioPlayer.addEventListener('ended', () => {
            audioIndicator.classList.remove('active');
            playBtn.classList.remove('playing');
            playBtn.textContent = 'Play';

            if (presentationRunning && autoAdvance) {
                setTimeout(() => {
                    nextSlide();
                }, 500);
            }
        });

        // Play button handler
        playBtn.addEventListener('click', toggleAudio);

        // Touch/Swipe support
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        const slideContainer = document.querySelector('.slide-container');

        slideContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });

        slideContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            // Only handle horizontal swipes (ignore vertical)
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    prevSlide();
                } else {
                    nextSlide();
                }
            }
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            // Don't capture if jump dialog is open (except Escape)
            if (showJumpDialog && e.key !== 'Escape') {
                return;
            }

            // Don't capture if help is visible
            if (showHelp && e.key !== 'Escape' && e.key !== 'h' && e.key !== 'H' && e.key !== '?') {
                return;
            }

            // Don't capture if grid is visible (except Escape and G)
            if (showGrid && e.key !== 'Escape' && e.key !== 'g' && e.key !== 'G') {
                return;
            }

            switch (e.key) {
                case 'ArrowRight':
                case 'PageDown':
                case 'l':
                case 'L':
                    nextSlide();
                    break;
                case 'ArrowLeft':
                case 'PageUp':
                case 'j':
                case 'J':
                    prevSlide();
                    break;
                case ' ':
                    e.preventDefault();
                    toggleAudio();
                    break;
                case 'n':
                case 'N':
                    toggleNotes();
                    break;
                case 't':
                case 'T':
                    toggleTimer();
                    break;
                case 'Enter':
                    togglePresentation();
                    break;
                case 'Home':
                    goToSlide(0);
                    break;
                case 'End':
                    goToSlide(slides.length - 1);
                    break;
                case 'r':
                case 'R':
                    if (!e.ctrlKey && !e.metaKey) {
                        elapsedSeconds = 0;
                        updateTimer();
                    }
                    break;
                case 'p':
                case 'P':
                    if (!e.ctrlKey && !e.metaKey) {
                        printPresentation();
                    }
                    break;
                case 'h':
                case 'H':
                case '?':
                    toggleHelp();
                    break;
                case 'Escape':
                    if (showJumpDialog) {
                        toggleJumpDialog();
                    } else if (showGrid) {
                        toggleGrid();
                    } else if (showHelp) {
                        toggleHelp();
                    } else if (showNotes) {
                        toggleNotes();
                    } else if (showDrawer) {
                        toggleDrawer();
                    } else if (showSectionPanel) {
                        toggleSectionPanel();
                    } else if (showFilmstrip) {
                        toggleFilmstrip();
                    }
                    break;
                case 'g':
                case 'G':
                    toggleGrid();
                    break;
                case 'd':
                case 'D':
                    toggleDrawer();
                    break;
                case 'b':
                case 'B':
                    toggleFilmstrip();
                    break;
                case 's':
                case 'S':
                    toggleSectionPanel();
                    break;
                case '/':
                    e.preventDefault();
                    toggleJumpDialog();
                    break;
                case 'f':
                case 'F':
                    if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen().catch(() => {});
                    } else {
                        document.exitFullscreen().catch(() => {});
                    }
                    break;
                default:
                    // Number keys 1-9 for quick navigation
                    if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey) {
                        const sectionIndex = parseInt(e.key) - 1;
                        if (sectionIndex < sections.length) {
                            goToSlide(sections[sectionIndex].startIndex);
                        }
                    }
            }
        });

        // Initialize target time display
        targetTimeEl.textContent = '/ ' + formatTime(targetSeconds);

        // Initialize
        updateSlide();
        updateTimer();
    `;
}

/**
 * Generates the help overlay HTML.
 */
function generateHelpOverlay(): string {
  return `
    <div class="help-overlay" id="helpOverlay">
        <div class="help-content">
            <h2>Keyboard Shortcuts</h2>
            <p class="close-hint">Press H, ?, or Escape to close</p>

            <div class="help-section">
                <h3>Navigation</h3>
                <div class="help-grid">
                    <kbd>&rarr;</kbd> <span>Next slide</span>
                    <kbd>&larr;</kbd> <span>Previous slide</span>
                    <kbd>Space</kbd> <span>Play/Pause audio</span>
                    <kbd>Home</kbd> <span>First slide</span>
                    <kbd>End</kbd> <span>Last slide</span>
                    <kbd>1-9</kbd> <span>Jump to section</span>
                </div>
            </div>

            <div class="help-section">
                <h3>Controls</h3>
                <div class="help-grid">
                    <kbd>Enter</kbd> <span>Start/Stop presentation</span>
                    <kbd>N</kbd> <span>Toggle speaker notes</span>
                    <kbd>T</kbd> <span>Toggle timer</span>
                    <kbd>R</kbd> <span>Reset timer</span>
                    <kbd>F</kbd> <span>Toggle fullscreen</span>
                    <kbd>P</kbd> <span>Print to PDF</span>
                </div>
            </div>

            <div class="help-section">
                <h3>Views</h3>
                <div class="help-grid">
                    <kbd>G</kbd> <span>Grid overview (all slides)</span>
                    <kbd>D</kbd> <span>Talk track drawer</span>
                    <kbd>B</kbd> <span>Thumbnail filmstrip</span>
                    <kbd>S</kbd> <span>Section navigation</span>
                    <kbd>/</kbd> <span>Quick jump to slide</span>
                </div>
            </div>

            <div class="help-section">
                <h3>Touch Gestures</h3>
                <div class="help-grid">
                    <kbd>Swipe Left</kbd> <span>Next slide</span>
                    <kbd>Swipe Right</kbd> <span>Previous slide</span>
                </div>
            </div>
        </div>
    </div>`;
}

/**
 * Generates the thumbnail filmstrip HTML.
 */
function generateFilmstrip(slides: PreparedHtmlSlide[]): string {
  const filmstripItems = slides.map((slide, index) => `
            <div class="filmstrip-item${index === 0 ? ' current' : ''}" data-index="${index}" onclick="goToSlide(${index})">
                <img src="${escapeHtml(slide.imagePath)}" alt="${escapeHtml(slide.title)}" loading="lazy">
                <div class="filmstrip-item-label">${index + 1}</div>
            </div>`).join('');

  return `
        <div class="filmstrip" id="filmstrip">
            <div class="filmstrip-inner">
                ${filmstripItems}
            </div>
        </div>`;
}

/**
 * Generates the grid overlay HTML for thumbnail view of all slides.
 */
function generateGridOverlay(slides: PreparedHtmlSlide[]): string {
  const gridItems = slides.map((slide, index) => `
        <div class="grid-item${index === 0 ? ' current' : ''}" data-index="${index}" onclick="goToSlideFromGrid(${index})">
            <img src="${escapeHtml(slide.imagePath)}" alt="${escapeHtml(slide.title)}" loading="lazy">
            <div class="grid-item-info">
                <div class="grid-item-number">${index + 1}</div>
                <div class="grid-item-title">${escapeHtml(slide.title)}</div>
                <div class="grid-item-section">${escapeHtml(slide.section)}</div>
            </div>
        </div>`).join('');

  return `
    <div class="grid-overlay" id="gridOverlay">
        <div class="grid-header">
            <h2>All Slides</h2>
            <button class="grid-close" onclick="toggleGrid()">&times;</button>
        </div>
        <div class="grid-container">
            ${gridItems}
        </div>
    </div>`;
}

/**
 * Generates the talk track drawer HTML.
 */
function generateDrawer(slides: PreparedHtmlSlide[]): string {
  const drawerSlides = slides.map((slide, index) => {
    // Use speaker notes or a placeholder
    const talkTrackText = slide.speakerNotes || 'No talk track for this slide.';
    return `
        <div class="drawer-slide${index === 0 ? ' current' : ''}" data-index="${index}" onclick="goToSlideFromDrawer(${index})">
            <div class="drawer-slide-header">
                <span class="drawer-slide-number">${index + 1}</span>
                <span class="drawer-slide-title">${escapeHtml(slide.title)}</span>
            </div>
            <div class="drawer-slide-text">${escapeHtml(talkTrackText)}</div>
        </div>`;
  }).join('');

  return `
    <div class="drawer" id="drawer">
        <div class="drawer-header">
            <h3>Talk Track</h3>
            <button class="drawer-close" onclick="toggleDrawer()">&times;</button>
        </div>
        <div class="drawer-content">
            ${drawerSlides}
        </div>
    </div>`;
}

/**
 * Generates the section navigation panel HTML.
 */
function generateSectionPanel(sections: SectionInfo[]): string {
  const sectionItems = sections.map((section, index) => `
        <li>
            <div class="section-item${index === 0 ? ' current' : ''}" data-section="${index}" onclick="goToSection(${section.startIndex})">
                <span class="section-dot" style="background: ${escapeHtml(section.color)}"></span>
                <span class="section-name">${escapeHtml(section.name)}</span>
                <span class="section-count">${section.slideCount}</span>
            </div>
        </li>`).join('');

  return `
    <div class="section-panel" id="sectionPanel">
        <h4>Sections</h4>
        <ul class="section-list">
            ${sectionItems}
        </ul>
    </div>`;
}

/**
 * Generates the quick jump dialog HTML.
 */
function generateJumpDialog(): string {
  return `
    <div class="jump-dialog" id="jumpDialog">
        <div class="jump-input-wrapper">
            <input type="text" class="jump-input" id="jumpInput" placeholder="Type slide number or title..." autocomplete="off">
        </div>
        <div class="jump-results" id="jumpResults"></div>
        <div class="jump-hint">
            <kbd>Enter</kbd> to jump &middot; <kbd>↑↓</kbd> to navigate &middot; <kbd>Esc</kbd> to close
        </div>
    </div>`;
}

/**
 * Generates the complete HTML presentation document.
 *
 * @param metadata - Prepared presentation metadata
 * @param slides - Prepared slide data array
 * @param sections - Section information array
 * @param options - Rendering options
 * @returns Complete HTML document as string
 */
export function generateHtmlPresentation(
  metadata: PreparedHtmlMetadata,
  slides: PreparedHtmlSlide[],
  sections: SectionInfo[],
  options?: HtmlOptions,
): string {
  const opts: Required<HtmlOptions> = { ...DEFAULT_HTML_OPTIONS, ...options };

  const hasAudio = slides.some((s) => s.audioPath !== null);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <title>${escapeHtml(metadata.title)}</title>
    <style>${generateStyles(opts)}
    </style>
</head>
<body>
    <div class="presentation">
        <div class="slide-container">
            <img class="slide" id="currentSlide" src="" alt="Slide">
        </div>

        <div class="speaker-notes" id="speakerNotes">
            <div class="speaker-notes-header">Speaker Notes</div>
            <div id="notesText"></div>
        </div>

        ${generateFilmstrip(slides)}

        <div class="control-bar">
            <!-- Timer -->
            <div class="control-group">
                <div class="timer" id="timer" title="Click T to toggle">00:00</div>
                <span class="target-time" id="targetTime">/ --:--</span>
            </div>

            <div class="divider"></div>

            <!-- Presentation Controls -->
            <div class="control-group">
                <button class="btn btn-start" id="startBtn" onclick="togglePresentation()">Start</button>
                <button class="btn btn-reset" id="resetBtn" onclick="resetTimer()">Reset</button>
            </div>

            <div class="divider"></div>

            <!-- Navigation -->
            <div class="control-group">
                <button class="btn btn-nav" id="prevBtn" onclick="prevSlide()">&larr;</button>
                <button class="btn btn-play${hasAudio ? '' : ' no-audio'}" id="playBtn">${hasAudio ? 'Play' : 'No Audio'}</button>
                <button class="btn btn-nav" id="nextBtn" onclick="nextSlide()">&rarr;</button>
            </div>

            <div class="divider"></div>

            <!-- Progress -->
            <div class="progress">
                <span class="section-label" id="sectionLabel">Loading...</span>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <span class="slide-counter" id="slideCounter">1 / ${slides.length}</span>
            </div>

            <!-- Audio Indicator -->
            <div class="audio-indicator" id="audioIndicator">
                <div class="audio-wave">
                    <span></span><span></span><span></span><span></span><span></span>
                </div>
            </div>

            <div class="divider"></div>

            <!-- Mode Toggle -->
            <div class="control-group">
                <button class="mode-btn active" id="modeAuto" onclick="setMode('auto')">Auto</button>
                <button class="mode-btn" id="modeManual" onclick="setMode('manual')">Manual</button>
            </div>

            <div class="divider"></div>

            <!-- Clock -->
            <div class="clock" id="clock">--:--</div>
        </div>
    </div>

    ${generateHelpOverlay()}

    ${generateGridOverlay(slides)}

    ${generateDrawer(slides)}

    ${generateSectionPanel(sections)}

    ${generateJumpDialog()}

    <audio id="audioPlayer" preload="auto"></audio>

    <script>
        // HTML Presentation - Generated ${metadata.generatedAt}
        ${generateScript(slides, sections, metadata, opts)}
    </script>
</body>
</html>
`;
}
