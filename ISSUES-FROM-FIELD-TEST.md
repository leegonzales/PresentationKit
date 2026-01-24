# PresentationKit Field Test Issues

**Date:** 2026-01-22
**Tester:** Claude (building Claude Skills & Projects Intensive presentation)
**Talk Track:** 28 slides, 120 minutes, with custom slides + PDF reference images

---

## Summary

Built a 28-slide presentation using `pk build`. HTML/notes generation worked after fixes; video rendering failed due to asset path issues. This document captures issues and suggested fixes for the next Claude working on PresentationKit.

---

## Issues Encountered

### 1. Appendix Slides Cause Validation Error

**Symptom:** Build fails with "Slide content validation failed"

**Cause:** Talk track had content sections (e.g., `## [appendix-migration] ...`) that weren't in the slides table. The parser treats extra content sections as errors.

**Error message (only visible when running parser directly):**
```
Slide content for unknown slug: "appendix-migration"
```

**Current behavior:** Parser at `src/parsers/talk-track.ts:291` validates that every content section slug exists in the slides table.

**Workaround applied:** Added appendix entries to the slides table with `A1`, `A2`, `A3` positions.

**Suggested fix options:**
1. **Lenient mode:** Allow extra content sections (ignore them gracefully)
2. **Better error messages:** Print the actual validation errors in CLI output, not just "Slide content validation failed"
3. **Documentation:** Clarify that all `## [slug]` sections MUST have corresponding table entries

**Files to modify:**
- `src/parsers/talk-track.ts` - line ~291, ~332
- `src/cli/commands/build.ts` - improve error output

---

### 2. Video Rendering Fails - Images Not Found (CRITICAL)

**Symptom:** Remotion can't find images at `http://localhost:3000/public/images/...`

**Error:**
```
[http://localhost:3000/public/images/slide-title-branded.png] Failed to load resource: 404
EncodingError: The source image cannot be decoded.
```

**Root cause:**
- `src/renderers/remotion/components/Slide.tsx` uses `staticFile(slide.imagePath)` for relative paths
- `staticFile()` looks in Remotion's bundled `public/` directory
- The orchestrator never copies images to `public/` or the output directory

**Missing step in pipeline:** After parsing talk track, need to:
1. Resolve image paths relative to talk track source file
2. Copy images to output directory's `images/` folder (or to PresentationKit's `public/images/`)
3. Update timeline with correct paths that Remotion can serve

**Files to modify:**
- `src/orchestrator/index.ts` - Add `copyAssets()` step after parsing
- Potentially add a `--source-dir` option to specify where images live relative to talk track

**Workaround attempted:** Manually copying images to output directory didn't work because Remotion bundles its own temp directory and doesn't serve from output path.

---

### 3. Video Rendering Fails - Audio Paths Malformed

**Symptom:** Audio file requests use absolute path prepended with localhost

**Error:**
```
http://localhost:3000/Users/leegonzales/.../output-emma/audio/title.wav
Error: Received a status code of 404
```

**Root cause:** Audio paths in timeline are absolute (`/Users/...`) but get treated as relative by Remotion's URL construction.

**Related code:**
- `src/renderers/remotion/Presentation.tsx:174-178` - audio path handling
- The path starting with `/` is passed directly instead of through `staticFile()`

**Suggested fix:**
- Either copy audio to `public/audio/` and use relative paths
- Or use `file://` protocol for local absolute paths
- Or bundle audio with the Remotion webpack build

---

### 4. Error Messages Don't Show Details

**Symptom:** CLI shows "Build failed" with generic "Slide content validation failed" but not the actual errors.

**Current behavior:** `TalkTrackParseError` has an `errors` array but it's not printed.

**Code location:** `src/parsers/talk-track.ts:332`

**Suggested fix:** In CLI error handler, check for `error.errors` array and print each item:
```typescript
if (error instanceof TalkTrackParseError && error.errors) {
  console.error('Validation errors:');
  error.errors.forEach(e => console.error(`  - ${e}`));
}
```

---

### 5. Mixed Image Path Formats Are Confusing

**Observation:** The talk track format allows image references in two places:
1. Slides table: `| 1 | title | Title | slide-title.png |`
2. Content section: `![Title](images/slide-title-branded.png)`

The parser uses the content section path if present, otherwise falls back to table path (`src/parsers/talk-track.ts:297`).

**Confusion:** The sample fixture uses `slide-01-title.png` in table but `images/slide-01-title.png` in content. Which is authoritative?

**Suggested improvement:**
- Document the relationship clearly
- Consider normalizing all paths to have `images/` prefix
- Or make the table column the authoritative source and ignore markdown images

---

### 6. HTML Presentation Lacks Auto-Advance Mode

**User expectation:** Play presentation continuously with audio auto-advancing to next slide.

**Current behavior:** HTML is a manual slideshow - user must press Space to play audio, then navigate to next slide manually.

**Use case gap:** Users want a "kiosk mode" or "auto-play" that:
1. Plays audio for current slide
2. Auto-advances to next slide when audio completes
3. Continues through entire presentation

**Suggested feature:** Add `autoPlay` option or keyboard shortcut (e.g., `A` for auto-play mode) that chains audio playback with slide advancement.

**Workaround:** Use video output (once asset paths are fixed) for continuous playback.

---

## What Worked Well

1. **HTML generation:** Clean, keyboard-navigable presentation output
2. **Notes generation:** Speaker notes HTML rendered correctly
3. **Audio generation (Kokoro):** TTS worked smoothly with bf_emma voice
4. **Parser structure:** Talk Track v5 format is well-designed
5. **YAML frontmatter:** Section colors, metadata all parsed correctly

---

## Suggested Priority Order

1. **P0 - Asset copying:** Video rendering is completely broken without this
2. **P1 - Error messages:** Debugging is painful without seeing actual errors
3. **P2 - Documentation:** Clarify talk track format expectations
4. **P3 - Appendix handling:** Either support extra sections or error clearly

---

## Test Talk Track Location

The talk track used for this test is at:
```
~/Projects/leegonzales/AIEnablementTraining/programs/intensives/claude-skills-projects/talk-track.md
```

It includes:
- 28 slides (25 main + 3 appendix)
- Custom generated images in `images/` folder
- PDF reference images (copied to flat structure)
- YAML sections with colors
- Full `<!-- AUDIO -->` blocks for all slides

---

## Reproduction Steps

```bash
# This succeeds (HTML + notes only)
pk build talk-track.md --output html,notes --voice bf_emma

# This fails (with video)
pk build talk-track.md --voice bf_emma
```

---

*Written with appreciation for the solid foundation. These are fixable issues, not fundamental problems. Happy coding, future Claude!*
