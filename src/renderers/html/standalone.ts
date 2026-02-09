/**
 * Standalone HTML Presentation Renderer
 *
 * Generates a self-contained HTML presentation with all assets embedded as
 * base64 data URIs. The resulting file can be opened in any browser without
 * requiring access to external files.
 *
 * Features:
 * - Embeds all images as base64 data URIs
 * - Converts WAV audio to MP3 and embeds as base64
 * - Full-screen slide display with keyboard navigation
 * - Speaker notes toggle
 * - Auto-advance mode for continuous playback
 * - Progress tracking
 * - Touch/swipe support for mobile
 */

import { execa } from 'execa';
import { readFile, writeFile, mkdir, access, stat } from 'node:fs/promises';
import { dirname, join, resolve, basename, extname, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';

import type { TalkTrackV5, Section } from '../../parsers/types.js';
import type { Timeline, TimelineSlide } from '../../generators/timeline/types.js';
import { stripSemanticTags, getSectionColor, getSectionName, escapeHtml, escapeJs } from './utils.js';
import { resolveImagePath } from '../../utils/asset-copier.js';
import { resolveTheme, applyImageSuffix } from '../../themes/index.js';

/**
 * Voice configuration for multi-voice support.
 */
export interface VoiceConfig {
  /** Display name for the voice (e.g., "George", "Emma") */
  name: string;
  /** Directory name containing the voice audio files */
  directory: string;
}

/**
 * Options for standalone HTML rendering.
 */
export interface StandaloneHtmlOptions {
  /** Primary brand color for UI elements (hex) */
  primaryColor?: string;
  /** MP3 bitrate for audio compression (default: "64k") */
  mp3Bitrate?: string;
  /** Whether to show auto-advance button (default: true) */
  enableAutoAdvance?: boolean;
  /** Theme name for image variants and color presets */
  theme?: string;
  /** Callback for progress updates */
  onProgress?: (message: string, progress: number) => void;
  /** Multi-voice configuration (if provided, enables voice toggle) */
  voices?: VoiceConfig[];
}

/**
 * Default options for standalone HTML rendering.
 */
const DEFAULT_OPTIONS: Required<Omit<StandaloneHtmlOptions, 'onProgress' | 'voices'>> = {
  primaryColor: '#557373',
  mp3Bitrate: '64k',
  enableAutoAdvance: true,
  theme: '',
};

/**
 * MIME types for common image formats.
 */
const IMAGE_MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

/**
 * Checks if a file exists.
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts an image file to a base64 data URI.
 *
 * @param imagePath - Path to the image file
 * @returns Object with mime type and base64 data, or empty strings if not found
 */
async function imageToBase64(imagePath: string): Promise<{ mime: string; data: string }> {
  if (!await fileExists(imagePath)) {
    return { mime: '', data: '' };
  }

  const ext = extname(imagePath).toLowerCase();
  const mime = IMAGE_MIME_TYPES[ext] || 'image/png';

  const buffer = await readFile(imagePath);
  const data = buffer.toString('base64');

  return { mime, data };
}

/**
 * Converts a WAV audio file to MP3 and returns base64 encoded string.
 *
 * Uses ffmpeg for conversion with mono output optimized for speech.
 *
 * @param wavPath - Path to the WAV file
 * @param bitrate - MP3 bitrate (e.g., "64k")
 * @returns Base64 encoded MP3 data, or empty string if conversion fails
 */
async function wavToMp3Base64(wavPath: string, bitrate: string = '64k'): Promise<string> {
  if (!await fileExists(wavPath)) {
    return '';
  }

  const tmpPath = join(tmpdir(), `pk-audio-${randomUUID()}.mp3`);

  try {
    await execa('ffmpeg', [
      '-y',
      '-i', wavPath,
      '-codec:a', 'libmp3lame',
      '-b:a', bitrate,
      '-ac', '1', // Mono for speech
      tmpPath,
    ]);

    const buffer = await readFile(tmpPath);
    return buffer.toString('base64');
  } catch (error: unknown) {
    // execa errors include stderr for better diagnostics
    const execaError = error as { stderr?: string; message?: string };
    const details = execaError.stderr || execaError.message || String(error);
    console.warn(`Warning: Failed to convert ${wavPath} to MP3. Details: ${details}`);
    return '';
  } finally {
    // Clean up temp file
    await rm(tmpPath, { force: true }).catch((err) => console.warn(`Failed to clean up temp file ${tmpPath}:`, err));
  }
}


/**
 * Prepared slide data with embedded assets.
 */
interface PreparedStandaloneSlide {
  id: string;
  title: string;
  section: string;
  sectionColor: string;
  imageDataUri: string;
  audioDataUri: string;
  /** Multi-voice audio data URIs keyed by voice name (lowercase) */
  voiceAudioDataUris: Record<string, string>;
  notes: string;
}

/**
 * Prepares slides with embedded base64 assets.
 *
 * @param talkTrack - Parsed talk track
 * @param timeline - Timeline with audio paths (audio is relative to audioBaseDir)
 * @param sourceDir - Directory for resolving image paths (talk track location)
 * @param audioBaseDir - Directory for resolving audio paths (output directory)
 * @param options - Rendering options
 * @param voices - Optional voice configurations for multi-voice
 * @param onProgress - Progress callback
 */
async function prepareSlides(
  talkTrack: TalkTrackV5,
  timeline: Timeline | null,
  sourceDir: string,
  audioBaseDir: string,
  options: Required<Omit<StandaloneHtmlOptions, 'onProgress' | 'voices'>>,
  voices?: VoiceConfig[],
  onProgress?: (message: string, progress: number) => void,
  themeSuffix?: string,
): Promise<PreparedStandaloneSlide[]> {
  const slides: PreparedStandaloneSlide[] = [];
  const totalSlides = talkTrack.slides.length;

  for (let i = 0; i < talkTrack.slides.length; i++) {
    const slideDef = talkTrack.slides[i];
    const content = talkTrack.slideContent.get(slideDef.slug);
    const timelineSlide = timeline?.slides.find((s) => s.slug === slideDef.slug);

    const progress = (i + 1) / totalSlides;
    onProgress?.(`Processing slide ${i + 1}/${totalSlides}: ${slideDef.slug}`, progress);

    // Get section info
    const sectionColor = getSectionColor(slideDef.section, talkTrack.sections, options.primaryColor);
    const sectionName = getSectionName(slideDef.section, talkTrack.sections);

    // Prepare speaker notes
    let notes = '';
    if (content?.audioText) {
      notes = stripSemanticTags(content.audioText);
    }
    if (content?.speakerNotes) {
      notes = notes ? `${notes}\n\n${content.speakerNotes}` : content.speakerNotes;
    }

    // Resolve and embed image (with theme suffix fallback)
    let imageDataUri = '';
    const imagePath = content?.imagePath || slideDef.image;
    if (imagePath) {
      let resolvedImagePath = imagePath;
      let fullImagePath = resolveImagePath(imagePath, sourceDir);

      // If theme is active, try themed image first
      if (themeSuffix) {
        const themedPath = applyImageSuffix(imagePath, themeSuffix);
        const themedFullPath = resolveImagePath(themedPath, sourceDir);
        if (await fileExists(themedFullPath)) {
          resolvedImagePath = themedPath;
          fullImagePath = themedFullPath;
        }
      }

      const { mime, data } = await imageToBase64(fullImagePath);
      if (data) {
        imageDataUri = `data:${mime};base64,${data}`;
        const sizeKb = Math.round(data.length * 0.75 / 1024);
        console.log(`  [IMG] ${basename(resolvedImagePath)} (${sizeKb}KB)`);
      } else {
        console.warn(`  [WARN] Missing image: ${imagePath}`);
      }
    }

    // Resolve and embed audio (convert WAV to MP3)
    // Audio paths are relative to the output directory (audioBaseDir), not sourceDir
    let audioDataUri = '';
    const voiceAudioDataUris: Record<string, string> = {};

    if (voices && voices.length > 0) {
      // Multi-voice: process audio from each voice directory
      for (const voice of voices) {
        const voiceName = voice.name.toLowerCase();
        const audioFilename = `${slideDef.slug}.wav`;
        const audioPath = join(audioBaseDir, voice.directory, audioFilename);

        const mp3Data = await wavToMp3Base64(audioPath, options.mp3Bitrate);
        if (mp3Data) {
          voiceAudioDataUris[voiceName] = `data:audio/mpeg;base64,${mp3Data}`;
          const sizeKb = Math.round(mp3Data.length * 0.75 / 1024);
          console.log(`  [MP3] ${voice.name}/${audioFilename} -> MP3 (${sizeKb}KB)`);
        } else {
          console.warn(`  [WARN] Missing ${voice.name} audio: ${audioPath}`);
        }
      }
      // Use first voice as default
      const firstVoice = voices[0].name.toLowerCase();
      audioDataUri = voiceAudioDataUris[firstVoice] || '';
    } else if (timelineSlide?.audioPath) {
      // Single voice: use timeline audio path
      const audioPath = isAbsolute(timelineSlide.audioPath)
        ? timelineSlide.audioPath
        : join(audioBaseDir, timelineSlide.audioPath);
      const mp3Data = await wavToMp3Base64(audioPath, options.mp3Bitrate);
      if (mp3Data) {
        audioDataUri = `data:audio/mpeg;base64,${mp3Data}`;
        const sizeKb = Math.round(mp3Data.length * 0.75 / 1024);
        console.log(`  [MP3] ${basename(audioPath)} -> MP3 (${sizeKb}KB)`);
      } else {
        console.warn(`  [WARN] Missing audio: ${timelineSlide.audioPath}`);
      }
    }

    // Create slide ID
    const slideId = slideDef.position.match(/^\d+$/)
      ? `${slideDef.position.padStart(2, '0')}-${slideDef.slug}`
      : `${slideDef.position}-${slideDef.slug}`;

    slides.push({
      id: slideId,
      title: slideDef.title,
      section: sectionName,
      sectionColor,
      imageDataUri,
      audioDataUri,
      voiceAudioDataUris,
      notes: escapeJs(notes),
    });
  }

  return slides;
}

/**
 * Generates the standalone HTML presentation.
 */
function generateStandaloneHtml(
  title: string,
  slides: PreparedStandaloneSlide[],
  options: Required<Omit<StandaloneHtmlOptions, 'onProgress' | 'voices'>>,
  voices?: VoiceConfig[],
): string {
  const hasMultiVoice = voices && voices.length > 0;
  const voiceNames = voices?.map(v => v.name) || [];

  const slideDataEntries = slides.map((slide) => {
    // Generate voice audio object if multi-voice is present
    let voiceAudioJs = 'null';
    if (hasMultiVoice && Object.keys(slide.voiceAudioDataUris).length > 0) {
      const voiceEntries = Object.entries(slide.voiceAudioDataUris).map(([name, dataUri]) => {
        return `'${name}': '${dataUri}'`;
      });
      voiceAudioJs = `{ ${voiceEntries.join(', ')} }`;
    }
    return `            { id: '${slide.id}', title: '${escapeJs(slide.title)}', section: '${escapeJs(slide.section)}', sectionColor: '${slide.sectionColor}', image: '${slide.imageDataUri}', audio: '${slide.audioDataUri}', voiceAudio: ${voiceAudioJs}, notes: '${slide.notes}' }`;
  });
  const slideData = slideDataEntries.join(',\n');

  const generated = new Date().toISOString().split('T')[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <meta name="generator" content="PresentationKit Standalone Generator">
    <meta name="generated" content="${generated}">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --primary: ${options.primaryColor};
            --bg: #0d0d0d;
            --bg-light: #F2EFEA;
            --notes-width: 350px;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: white;
            overflow: hidden;
            height: 100vh;
        }
        .loading {
            position: fixed;
            inset: 0;
            background: var(--bg);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            transition: opacity 0.5s;
        }
        .loading.hidden { opacity: 0; pointer-events: none; }
        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 3px solid var(--primary);
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .presentation-wrapper {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .slides-container {
            flex: 1;
            position: relative;
            overflow: hidden;
            transition: margin-right 0.3s ease;
        }
        .slides-container.notes-open { margin-right: var(--notes-width); }
        .slide {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.4s ease;
            background: var(--bg-light);
        }
        .slide.active { opacity: 1; pointer-events: auto; z-index: 1; }
        .slide img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .section-indicator {
            position: absolute;
            top: 12px;
            left: 12px;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            color: white;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            z-index: 10;
        }
        .audio-indicator {
            position: absolute;
            top: 12px;
            right: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 14px;
            background: rgba(0, 0, 0, 0.7);
            border-radius: 20px;
            color: white;
            font-size: 11px;
            text-transform: uppercase;
            z-index: 10;
        }
        .audio-indicator .bars {
            display: flex;
            align-items: flex-end;
            gap: 2px;
            height: 14px;
        }
        .audio-indicator .bar {
            width: 3px;
            background: var(--primary);
            border-radius: 1px;
        }
        .audio-indicator.playing .bar {
            animation: equalizer 0.5s ease-in-out infinite alternate;
        }
        .audio-indicator .bar:nth-child(1) { height: 40%; animation-delay: 0s; }
        .audio-indicator .bar:nth-child(2) { height: 70%; animation-delay: 0.1s; }
        .audio-indicator .bar:nth-child(3) { height: 50%; animation-delay: 0.2s; }
        .audio-indicator .bar:nth-child(4) { height: 80%; animation-delay: 0.3s; }
        @keyframes equalizer {
            from { height: 20%; }
            to { height: 100%; }
        }
        .controls {
            height: 70px;
            background: rgba(20, 20, 20, 0.98);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            padding: 0 20px;
            gap: 15px;
            z-index: 100;
        }
        .control-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .btn {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: white;
            width: 36px;
            height: 36px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: all 0.2s;
        }
        .btn:hover { background: rgba(255, 255, 255, 0.2); }
        .btn.active { background: var(--primary); }
        .btn-nav { width: 44px; height: 44px; font-size: 20px; }
        .btn-play {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: var(--primary);
            font-size: 22px;
        }
        .btn-play:hover { background: #6a8a8a; transform: scale(1.05); }
        .progress-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
            min-width: 200px;
        }
        .progress-bar {
            height: 6px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            overflow: hidden;
            cursor: pointer;
        }
        .progress-fill {
            height: 100%;
            background: var(--primary);
            transition: width 0.3s;
            border-radius: 3px;
        }
        .audio-progress {
            height: 3px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
            overflow: hidden;
        }
        .audio-progress-fill {
            height: 100%;
            background: rgba(85, 115, 115, 0.8);
            width: 0;
        }
        .progress-info {
            display: flex;
            justify-content: space-between;
            color: rgba(255, 255, 255, 0.6);
            font-size: 11px;
        }
        .volume-control {
            display: flex;
            align-items: center;
            gap: 6px;
            color: rgba(255, 255, 255, 0.7);
        }
        .volume-control input { width: 70px; accent-color: var(--primary); }
        .notes-panel {
            position: fixed;
            top: 0;
            right: 0;
            width: var(--notes-width);
            height: calc(100vh - 70px);
            background: rgba(25, 25, 25, 0.98);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            z-index: 50;
            display: flex;
            flex-direction: column;
        }
        .notes-panel.visible { transform: translateX(0); }
        .notes-header {
            padding: 16px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .notes-header h3 {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--primary);
            font-weight: 600;
        }
        .notes-close {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.5);
            font-size: 20px;
            cursor: pointer;
            padding: 4px 8px;
        }
        .notes-close:hover { color: white; }
        .notes-content {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            font-size: 14px;
            line-height: 1.7;
            color: rgba(255, 255, 255, 0.85);
            white-space: pre-wrap;
        }
        .shortcuts-help {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(20, 20, 20, 0.98);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
            padding: 30px;
            border-radius: 12px;
            display: none;
            z-index: 300;
            min-width: 350px;
        }
        .shortcuts-help.visible { display: block; }
        .shortcuts-help h2 { margin-bottom: 20px; color: var(--primary); font-size: 18px; }
        .shortcut-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 13px;
        }
        .shortcut-key {
            background: rgba(255, 255, 255, 0.1);
            padding: 2px 10px;
            border-radius: 4px;
            font-family: monospace;
        }
        .voice-toggle {
            display: flex;
            gap: 2px;
            background: rgba(0, 0, 0, 0.3);
            padding: 2px;
            border-radius: 4px;
        }
        .voice-btn {
            padding: 4px 10px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: rgba(255, 255, 255, 0.6);
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.15s;
        }
        .voice-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.9);
        }
        .voice-btn.active {
            background: var(--primary);
            color: white;
        }
        .voice-toggle-label {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.5);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-right: 4px;
            display: flex;
            align-items: center;
        }
        .standalone-badge {
            position: fixed;
            bottom: 80px;
            right: 10px;
            background: rgba(85, 115, 115, 0.9);
            color: white;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            z-index: 10;
        }
    </style>
</head>
<body>
    <div class="loading" id="loading">
        <div class="loading-spinner"></div>
    </div>

    <div class="presentation-wrapper">
        <div class="slides-container" id="slidesContainer"></div>

        <div class="controls">
            <div class="control-group">
                <button class="btn btn-nav" id="btnPrev" title="Previous (Left)">&#8592;</button>
                <button class="btn btn-play" id="btnPlay" title="Play/Pause (Space)">
                    <span id="playIcon">&#9658;</span>
                </button>
                <button class="btn btn-nav" id="btnNext" title="Next (Right)">&#8594;</button>
            </div>

            <div class="progress-container">
                <div class="progress-bar" id="progressBar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <div class="audio-progress">
                    <div class="audio-progress-fill" id="audioProgressFill"></div>
                </div>
                <div class="progress-info">
                    <span>Slide <span id="currentSlide">1</span> / <span id="totalSlides">1</span></span>
                    <span id="timer">00:00</span>
                </div>
            </div>

            <div class="control-group">
                <div class="volume-control">
                    <span id="volumeIcon">&#128266;</span>
                    <input type="range" id="volumeSlider" min="0" max="1" step="0.1" value="1">
                </div>
            </div>

            ${hasMultiVoice ? `
            <div class="control-group">
                <span class="voice-toggle-label">Voice:</span>
                <div class="voice-toggle" id="voiceToggle">
                    ${voiceNames.map((name, i) => `<button class="voice-btn${i === 0 ? ' active' : ''}" data-voice="${name.toLowerCase()}" title="${name} (Shift+${name.charAt(0).toUpperCase()})">${name}</button>`).join('')}
                </div>
            </div>
            ` : ''}

            <div class="control-group">
                <button class="btn" id="btnAutoAdvance" title="Auto-advance (Y)">&#8634;</button>
                <button class="btn" id="btnNotes" title="Speaker notes (N)">&#128221;</button>
                <button class="btn" id="btnFullscreen" title="Fullscreen (F)">&#9974;</button>
                <button class="btn" id="btnHelp" title="Help (?)">?</button>
            </div>
        </div>
    </div>

    <div class="notes-panel" id="notesPanel">
        <div class="notes-header">
            <h3>Speaker Notes</h3>
            <button class="notes-close" id="notesClose">&times;</button>
        </div>
        <div class="notes-content" id="notesContent"></div>
    </div>

    <div class="shortcuts-help" id="shortcutsHelp">
        <h2>Keyboard Shortcuts</h2>
        <div class="shortcut-row"><span class="shortcut-key">&#8592; / &#8594;</span><span>Navigate slides</span></div>
        <div class="shortcut-row"><span class="shortcut-key">Space</span><span>Play/Pause</span></div>
        <div class="shortcut-row"><span class="shortcut-key">Y</span><span>Auto-advance</span></div>
        <div class="shortcut-row"><span class="shortcut-key">N</span><span>Toggle notes</span></div>
        <div class="shortcut-row"><span class="shortcut-key">F</span><span>Fullscreen</span></div>
        <div class="shortcut-row"><span class="shortcut-key">M</span><span>Mute</span></div>
        <div class="shortcut-row"><span class="shortcut-key">Esc</span><span>Close</span></div>
    </div>

    <div class="standalone-badge">Standalone</div>

    <script>
        const slides = [
${slideData}
        ];

        const hasMultiVoice = ${hasMultiVoice};
        const voiceNames = ${JSON.stringify(voiceNames.map(v => v.toLowerCase()))};
        let currentVoice = voiceNames.length > 0 ? voiceNames[0] : null;
        let currentSlideIndex = 0;
        let isPlaying = false;
        let autoAdvance = false;
        let audio = new Audio();

        const slidesContainer = document.getElementById('slidesContainer');
        const progressFill = document.getElementById('progressFill');
        const audioProgressFill = document.getElementById('audioProgressFill');
        const currentSlideEl = document.getElementById('currentSlide');
        const totalSlidesEl = document.getElementById('totalSlides');
        const notesPanel = document.getElementById('notesPanel');
        const notesContent = document.getElementById('notesContent');
        const shortcutsHelp = document.getElementById('shortcutsHelp');
        const timerEl = document.getElementById('timer');
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeIcon = document.getElementById('volumeIcon');
        const loading = document.getElementById('loading');

        function init() {
            totalSlidesEl.textContent = slides.length;
            createSlides();
            showSlide(0);
            setupEventListeners();
            setupAudio();
            setTimeout(() => loading.classList.add('hidden'), 500);
        }

        function formatTime(seconds) {
            const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
            const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
            return mins + ':' + secs;
        }

        function createSlides() {
            slides.forEach((slide, index) => {
                const slideEl = document.createElement('div');
                slideEl.className = 'slide';
                slideEl.id = 'slide-' + index;

                // Use textContent for user-provided values to prevent XSS
                const sectionIndicator = document.createElement('div');
                sectionIndicator.className = 'section-indicator';
                sectionIndicator.style.background = slide.sectionColor;
                sectionIndicator.textContent = slide.section;

                // Audio indicator uses static content only
                const audioIndicator = document.createElement('div');
                audioIndicator.className = 'audio-indicator';
                audioIndicator.id = 'audio-indicator-' + index;
                audioIndicator.innerHTML = '<div class="bars"><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div></div><span>Audio</span>';

                const img = document.createElement('img');
                img.src = slide.image;
                img.alt = slide.title;

                slideEl.append(sectionIndicator, audioIndicator, img);
                slidesContainer.appendChild(slideEl);
            });
        }

        function setupAudio() {
            audio.addEventListener('timeupdate', () => {
                if (audio.duration) {
                    audioProgressFill.style.width = ((audio.currentTime / audio.duration) * 100) + '%';
                    timerEl.textContent = formatTime(audio.currentTime);
                }
            });

            audio.addEventListener('ended', () => {
                isPlaying = false;
                updatePlayButton();
                updateAudioIndicator(false);
                audioProgressFill.style.width = '0%';
                if (autoAdvance && currentSlideIndex < slides.length - 1) {
                    setTimeout(() => {
                        nextSlide();
                        if (autoAdvance) setTimeout(() => playAudio(), 500);
                    }, 1000);
                }
            });

            audio.addEventListener('play', () => {
                isPlaying = true;
                updatePlayButton();
                updateAudioIndicator(true);
            });

            audio.addEventListener('pause', () => {
                isPlaying = false;
                updatePlayButton();
                updateAudioIndicator(false);
            });
        }

        function showSlide(index) {
            stopAudio();
            currentSlideIndex = index;

            document.querySelectorAll('.slide').forEach((el, i) => {
                el.classList.toggle('active', i === index);
            });

            progressFill.style.width = (((index + 1) / slides.length) * 100) + '%';
            currentSlideEl.textContent = index + 1;
            notesContent.textContent = slides[index].notes;
            timerEl.textContent = '00:00';
        }

        function nextSlide() {
            if (currentSlideIndex < slides.length - 1) showSlide(currentSlideIndex + 1);
        }

        function prevSlide() {
            if (currentSlideIndex > 0) showSlide(currentSlideIndex - 1);
        }

        function goToSlide(index) {
            if (index >= 0 && index < slides.length) showSlide(index);
        }

        function getSlideAudio(slide) {
            if (hasMultiVoice && slide.voiceAudio && currentVoice) {
                return slide.voiceAudio[currentVoice] || slide.audio;
            }
            return slide.audio;
        }

        function switchVoice(voiceName) {
            const wasPlaying = !audio.paused;
            const currentTime = audio.currentTime;
            currentVoice = voiceName.toLowerCase();

            // Update voice toggle buttons
            document.querySelectorAll('.voice-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.voice === currentVoice);
            });

            // If audio was playing, switch to new voice track at same position
            if (wasPlaying || currentTime > 0) {
                const slide = slides[currentSlideIndex];
                const newAudioSrc = getSlideAudio(slide);
                if (newAudioSrc) {
                    audio.src = newAudioSrc;
                    audio.currentTime = currentTime;
                    if (wasPlaying) {
                        audio.play().catch(e => console.log('Audio play failed:', e));
                    }
                }
            }
        }

        function playAudio() {
            const audioSrc = getSlideAudio(slides[currentSlideIndex]);
            if (audioSrc) {
                audio.src = audioSrc;
                audio.play().catch(e => console.log('Audio play failed:', e));
            }
        }

        function stopAudio() {
            audio.pause();
            audio.currentTime = 0;
            audioProgressFill.style.width = '0%';
        }

        function togglePlay() {
            if (isPlaying) audio.pause();
            else playAudio();
        }

        function updatePlayButton() {
            document.getElementById('playIcon').innerHTML = isPlaying ? '&#10074;&#10074;' : '&#9658;';
        }

        function updateAudioIndicator(playing) {
            const indicator = document.getElementById('audio-indicator-' + currentSlideIndex);
            if (indicator) indicator.classList.toggle('playing', playing);
        }

        function toggleAutoAdvance() {
            autoAdvance = !autoAdvance;
            document.getElementById('btnAutoAdvance').classList.toggle('active', autoAdvance);
        }

        function toggleNotes() {
            const isVisible = notesPanel.classList.toggle('visible');
            slidesContainer.classList.toggle('notes-open', isVisible);
            document.getElementById('btnNotes').classList.toggle('active', isVisible);
        }

        function toggleFullscreen() {
            if (document.fullscreenElement) document.exitFullscreen();
            else document.documentElement.requestFullscreen();
        }

        function toggleHelp() {
            shortcutsHelp.classList.toggle('visible');
        }

        function setupEventListeners() {
            document.getElementById('btnPrev').addEventListener('click', prevSlide);
            document.getElementById('btnNext').addEventListener('click', nextSlide);
            document.getElementById('btnPlay').addEventListener('click', togglePlay);
            document.getElementById('btnAutoAdvance').addEventListener('click', toggleAutoAdvance);
            document.getElementById('btnNotes').addEventListener('click', toggleNotes);
            document.getElementById('btnFullscreen').addEventListener('click', toggleFullscreen);
            document.getElementById('btnHelp').addEventListener('click', toggleHelp);
            document.getElementById('notesClose').addEventListener('click', toggleNotes);

            // Voice toggle buttons
            if (hasMultiVoice) {
                document.querySelectorAll('.voice-btn').forEach(btn => {
                    btn.addEventListener('click', () => switchVoice(btn.dataset.voice));
                });
            }

            volumeSlider.addEventListener('input', () => {
                audio.volume = parseFloat(volumeSlider.value);
                volumeIcon.innerHTML = audio.volume === 0 ? '&#128263;' : '&#128266;';
            });

            document.getElementById('progressBar').addEventListener('click', (e) => {
                const rect = e.target.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                goToSlide(Math.floor(percent * slides.length));
            });

            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT') return;
                switch (e.key) {
                    case 'ArrowRight': case 'PageDown': nextSlide(); break;
                    case 'ArrowLeft': case 'PageUp': prevSlide(); break;
                    case ' ': e.preventDefault(); togglePlay(); break;
                    case 'y': case 'Y': toggleAutoAdvance(); break;
                    case 'n': case 'N': toggleNotes(); break;
                    case 'f': case 'F': toggleFullscreen(); break;
                    case 'm': case 'M':
                        audio.muted = !audio.muted;
                        volumeIcon.innerHTML = audio.muted ? '&#128263;' : '&#128266;';
                        break;
                    case '?': toggleHelp(); break;
                    case 'Escape':
                        shortcutsHelp.classList.remove('visible');
                        break;
                    case 'Home': goToSlide(0); break;
                    case 'End': goToSlide(slides.length - 1); break;
                    default:
                        if (e.key >= '1' && e.key <= '9') goToSlide(parseInt(e.key) - 1);
                        // Voice shortcuts: Shift + first letter of voice name
                        if (e.shiftKey && hasMultiVoice && voiceNames.length > 0) {
                            const keyLower = e.key.toLowerCase();
                            const matchingVoice = voiceNames.find(v => v.startsWith(keyLower));
                            if (matchingVoice) switchVoice(matchingVoice);
                        }
                }
            });
        }

        init();
    </script>
</body>
</html>`;
}

/**
 * Renders a standalone HTML presentation with all assets embedded.
 *
 * @param talkTrack - Parsed Talk Track v5 document
 * @param timeline - Timeline with audio data (null if no audio generated)
 * @param outputPath - Path to write the HTML file
 * @param sourceDir - Directory containing source assets (images relative to this)
 * @param options - Optional rendering configuration
 *
 * @example
 * ```typescript
 * await renderStandaloneHtml(
 *   talkTrack,
 *   timeline,
 *   './output/presentation-standalone.html',
 *   './source-dir',
 *   { mp3Bitrate: '64k' }
 * );
 * ```
 */
export async function renderStandaloneHtml(
  talkTrack: TalkTrackV5,
  timeline: Timeline | null,
  outputPath: string,
  sourceDir: string,
  options?: StandaloneHtmlOptions,
): Promise<{ outputPath: string; fileSizeMb: number }> {
  const { voices, onProgress, ...restOptions } = options || {};
  const opts = { ...DEFAULT_OPTIONS, ...restOptions };

  // Resolve theme for image suffix
  const theme = opts.theme ? resolveTheme(opts.theme) : undefined;
  const themeSuffix = theme?.imageSuffix || '';

  // Apply theme colors if not explicitly overridden
  if (theme) {
    if (!options?.primaryColor) opts.primaryColor = theme.primaryColor;
  }

  // Output directory is where audio files are located (from timeline generation)
  const outputDir = dirname(outputPath);

  console.log(`\nGenerating standalone HTML presentation...`);
  console.log(`Source directory: ${sourceDir}`);
  console.log(`Audio directory: ${outputDir}`);
  console.log(`MP3 bitrate: ${opts.mp3Bitrate}`);
  if (voices && voices.length > 0) {
    console.log(`Multi-voice: ${voices.map(v => v.name).join(', ')}`);
  }

  // Prepare slides with embedded assets
  // Images are relative to sourceDir, audio is relative to outputDir
  const preparedSlides = await prepareSlides(
    talkTrack,
    timeline,
    sourceDir,
    outputDir,
    opts,
    voices,
    onProgress,
    themeSuffix,
  );

  // Generate HTML
  const html = generateStandaloneHtml(talkTrack.title, preparedSlides, opts, voices);
  await mkdir(outputDir, { recursive: true });

  // Write file
  await writeFile(outputPath, html, 'utf-8');

  // Get file size
  const stats = await stat(outputPath);
  const fileSizeMb = stats.size / (1024 * 1024);

  console.log(`\nWritten: ${outputPath}`);
  console.log(`File size: ${fileSizeMb.toFixed(1)} MB`);

  return { outputPath, fileSizeMb };
}
