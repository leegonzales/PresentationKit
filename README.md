# PresentationKit

Unified presentation infrastructure for transforming Talk Track v5 documents into HTML presentations, YouTube-ready videos, and printable speaker notes.

## Features

- **Parse Talk Track v5 format** - Structured markdown with slides, speaker notes, timing cues, and visual directions
- **Generate audio with Kokoro or ElevenLabs** - Local TTS via Kokoro for fast iteration, ElevenLabs for production quality
- **Build interactive HTML presentations** - Responsive slide decks with navigation, timing, and visual effects
- **Render YouTube-ready videos with Remotion** - Professional video output at 720p, 1080p, or 4K
- **Generate printable speaker notes** - Clean PDF-ready notes with slide thumbnails and timing
- **Cost tracking and resumable builds** - Monitor API costs and resume interrupted renders

## Prerequisites

- **Node.js 18+** - Required for running the CLI
- **FFmpeg** - Required for standalone HTML generation with embedded audio (WAV to MP3 conversion)

### Installing FFmpeg

**macOS (Homebrew):**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg
```

**Windows (Chocolatey):**
```bash
choco install ffmpeg
```

## Installation

```bash
npm install -g @leegonzales/presentation-kit
```

## Quick Start

Build a complete presentation (HTML + audio + video):

```bash
pk build presentation.md
```

Generate audio only with a specific voice:

```bash
pk audio presentation.md --voice af_heart
```

Render video at 1080p:

```bash
pk video presentation.md --quality 1080p
```

Generate speaker notes:

```bash
pk notes presentation.md --format pdf
```

## Talk Track v5 Format

Talk Track v5 is a structured markdown format for presentations:

```markdown
---
title: My Presentation
author: Your Name
duration: 15m
---

# Slide 1: Introduction

[VISUAL: Title card with logo]

Welcome to this presentation. Today we'll cover three key topics.

[PAUSE: 2s]

> TIMING: 0:00-0:45

---

# Slide 2: First Topic

[VISUAL: Diagram showing architecture]

Let me walk you through the architecture.

{EMPHASIS: This is the critical point}

> TIMING: 0:45-2:30
```

### Format Elements

| Element | Syntax | Description |
|---------|--------|-------------|
| Slide break | `---` | Separates slides |
| Visual cue | `[VISUAL: ...]` | Describes what appears on screen |
| Pause | `[PAUSE: Xs]` | Insert silence for effect |
| Timing | `> TIMING: X:XX-X:XX` | Slide timing range |
| Emphasis | `{EMPHASIS: ...}` | Text to stress vocally |
| Speaker note | `<!-- NOTE: ... -->` | Private notes not rendered |

## Configuration

Create `pk.config.yaml` in your project root:

```yaml
# Audio generation
audio:
  provider: kokoro          # kokoro | elevenlabs
  voice: af_heart           # Voice ID
  speed: 1.0                # Playback speed

# Video rendering
video:
  quality: 1080p            # 720p | 1080p | 4k
  fps: 30                   # Frame rate
  format: mp4               # Output format

# HTML output
html:
  theme: default            # Presentation theme
  controls: true            # Show navigation controls
  autoplay: false           # Auto-advance slides

# Build settings
build:
  outputDir: ./dist         # Output directory
  cacheDir: ./.pk-cache     # Cache for resumable builds
  trackCosts: true          # Log API usage costs
```

### Environment Variables

For ElevenLabs support:

```bash
export ELEVENLABS_API_KEY=your_api_key
```

## Commands

| Command | Description |
|---------|-------------|
| `pk build <file>` | Full build: HTML + audio + video |
| `pk audio <file>` | Generate audio only |
| `pk video <file>` | Render video (requires audio) |
| `pk html <file>` | Build HTML presentation |
| `pk html <file> --standalone` | Build standalone HTML with embedded assets |
| `pk notes <file>` | Generate speaker notes |
| `pk validate <file>` | Check Talk Track v5 syntax |
| `pk costs` | Show API cost summary |

### Standalone HTML

Generate a single, self-contained HTML file with all assets embedded as base64:

```bash
pk html presentation.md --standalone
```

This creates a portable presentation file that works offline with:
- Images embedded as base64 data URIs
- Audio converted to MP3 and embedded (requires FFmpeg)
- All CSS and JavaScript inlined

Options:
- `--mp3-bitrate <rate>` - MP3 bitrate for audio (default: 64k)

## Output Structure

```
dist/
  presentation/
    index.html          # Interactive HTML presentation
    slides/             # Individual slide assets
    audio/              # Generated audio files
    video.mp4           # Final rendered video
    notes.pdf           # Speaker notes
    manifest.json       # Build metadata
```

## License

MIT
