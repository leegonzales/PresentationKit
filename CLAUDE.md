# PresentationKit

Unified presentation infrastructure that transforms Talk Track v5 markdown into HTML, video, and speaker notes.

## Architecture

```
Talk Track v5 → Parsers → Generators → Renderers → Output
                  ↓           ↓            ↓
              Markdown    Audio/Images   HTML/Video/Notes
              + YAML      + Timeline     via Remotion
```

**4 Layers:**
1. **Parsers** (`src/parsers/`) - Parse Talk Track v5 markdown + YAML frontmatter
2. **Generators** (`src/generators/`) - Generate audio, images, and timeline data
3. **Renderers** (`src/renderers/`) - Output HTML, Remotion video, speaker notes
4. **Orchestrator** (`src/orchestrator/`) - Coordinates full pipeline

## CLI Commands

```bash
# Full build (all outputs)
pk build talk-track.md --output html,video,notes

# Individual outputs
pk audio talk-track.md --voice af_heart
pk video talk-track.md --quality 1080p
pk html talk-track.md
pk notes talk-track.md
```

## Directory Structure

```
src/
  cli/commands/       # CLI command implementations
  parsers/            # Talk Track v5 markdown parser
  generators/
    audio/            # TTS generation (Kokoro/ElevenLabs)
    images/           # Slide image generation
    timeline/         # Audio-visual sync timing
  renderers/
    html/             # Static HTML slideshow
    remotion/
      components/     # React components for video
    notes/            # Speaker notes export
  orchestrator/       # Pipeline coordination
  utils/              # Shared utilities
templates/            # Output templates
public/
  audio/              # Generated audio files
  images/             # Generated/source images
tests/
  fixtures/           # Test Talk Track files
  integration/        # End-to-end tests
```

## Talk Track v5 Format

```markdown
---
title: Presentation Title
voice: af_heart
---

| # | Slide | Duration | Notes |
|---|-------|----------|-------|
| 1 | Title | 30s | Opening |
| 2 | Main Point | 45s | Key content |

---
<!-- SLIDE 1: Title -->
![slide](images/slide-01.png)

<!-- AUDIO -->
Welcome to this presentation...
<!-- /AUDIO -->

---
<!-- SLIDE 2: Main Point -->
...
```

**Key elements:**
- YAML frontmatter for metadata
- Slide table with timing estimates
- Individual slides with `<!-- AUDIO -->` blocks for narration

## Voice Providers

| Provider | Cost | Captions | Use Case |
|----------|------|----------|----------|
| **Kokoro** | Free (local) | No word timestamps | Quick previews, offline |
| **ElevenLabs** | Paid API | Word-level timestamps | Production video with captions |

## Development

```bash
npm run dev      # Development mode
npm test         # Run tests
npm run build    # Production build
```

## Key Dependencies

- **Remotion** - Programmatic video rendering
- **Kokoro TTS** - Local text-to-speech
- **ElevenLabs** - Cloud TTS with timestamps

## Notes

- Audio files cached in `public/audio/` to avoid regeneration
- Timeline generator syncs audio duration with slide transitions
- Remotion compositions in `src/renderers/remotion/components/`
