#!/usr/bin/env npx tsx
/**
 * Video Generation Script
 *
 * Generates a video from an existing presentation with Talk Track and audio files.
 * Usage: npx tsx scripts/generate-video.ts <talk-track-path> <output-path>
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';

import { parseTalkTrack } from '../src/parsers/talk-track.js';
import { buildTimeline, summarizeTimeline } from '../src/generators/timeline/index.js';
import type { AudioManifest, AudioManifestEntry, WordTiming } from '../src/generators/timeline/types.js';

interface WhisperCaption {
  text: string;
  word_timings: Array<{ word: string; start: number; end: number }>;
  error?: string;
}

type WhisperCaptions = Record<string, WhisperCaption>;

/**
 * Gets audio duration using ffprobe.
 */
function getAudioDuration(audioPath: string): number {
  try {
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${audioPath}"`,
      { encoding: 'utf-8' },
    );
    return parseFloat(result.trim());
  } catch {
    throw new Error(`Failed to get duration for: ${audioPath}`);
  }
}

/**
 * Loads Whisper captions if available.
 */
function loadWhisperCaptions(presentationDir: string): WhisperCaptions | null {
  const captionsPath = join(presentationDir, 'output', 'captions.json');
  if (existsSync(captionsPath)) {
    const content = readFileSync(captionsPath, 'utf-8');
    return JSON.parse(content) as WhisperCaptions;
  }
  return null;
}

/**
 * Builds an audio manifest from existing audio files.
 */
function buildAudioManifest(
  presentationDir: string,
  slugs: string[],
  voice: string,
  whisperCaptions: WhisperCaptions | null,
): AudioManifest {
  const entries = new Map<string, AudioManifestEntry>();
  const audioDir = join(presentationDir, 'audio');

  for (const slug of slugs) {
    const audioPath = join(audioDir, `${slug}.wav`);

    if (!existsSync(audioPath)) {
      throw new Error(`Missing audio file: ${audioPath}`);
    }

    const duration = getAudioDuration(audioPath);

    // Get word timings from Whisper if available
    let wordTimings: WordTiming[] | undefined;
    if (whisperCaptions && whisperCaptions[slug]?.word_timings) {
      wordTimings = whisperCaptions[slug].word_timings.map((wt) => ({
        word: wt.word,
        start: wt.start,
        end: wt.end,
      }));
    }

    entries.set(slug, {
      slug,
      path: audioPath,
      duration,
      provider: 'kokoro',
      wordTimings,
    });
  }

  return {
    voice,
    provider: 'kokoro',
    entries,
  };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npx tsx scripts/generate-video.ts <talk-track-path> <output-path>');
    console.error('');
    console.error('Example:');
    console.error('  npx tsx scripts/generate-video.ts ./presentations/my-talk/talk-track.md ./output/video.mp4');
    process.exit(1);
  }

  const talkTrackPath = resolve(args[0]);
  const outputPath = resolve(args[1]);
  const presentationDir = dirname(talkTrackPath);

  console.log('=== PresentationKit Video Generator ===');
  console.log(`Talk Track: ${talkTrackPath}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Presentation Dir: ${presentationDir}`);
  console.log('');

  // Step 1: Parse talk track
  console.log('Step 1: Parsing talk track...');
  const content = readFileSync(talkTrackPath, 'utf-8');
  const talkTrack = parseTalkTrack(content);
  console.log(`  Title: ${talkTrack.title}`);
  console.log(`  Slides: ${talkTrack.slides.length}`);
  console.log(`  Voice: ${talkTrack.audioVoice}`);
  console.log('');

  // Step 2: Skip captions for now (Kokoro doesn't provide word timings)
  console.log('Step 2: Skipping captions (Kokoro local audio)...');
  const whisperCaptions = null; // Disabled until caption sync is fixed
  console.log('  Captions disabled - video will render without subtitles');
  console.log('');

  // Step 3: Build audio manifest from existing files
  console.log('Step 3: Building audio manifest from existing files...');
  const slugs = talkTrack.slides.map((s) => s.slug);
  const audioManifest = buildAudioManifest(presentationDir, slugs, talkTrack.audioVoice, whisperCaptions);

  let totalAudioDuration = 0;
  for (const entry of audioManifest.entries.values()) {
    console.log(`  ${entry.slug}: ${entry.duration.toFixed(2)}s`);
    totalAudioDuration += entry.duration;
  }
  console.log(`  Total audio: ${totalAudioDuration.toFixed(2)}s (${(totalAudioDuration / 60).toFixed(1)} min)`);
  console.log('');

  // Step 4: Build timeline
  console.log('Step 4: Building timeline...');
  const timeline = buildTimeline(talkTrack, audioManifest, {
    fps: 30,
    width: 1920,
    height: 1080,
    transitionPadding: 0.3,
  });

  // Fix paths to be relative to presentation directory for Remotion's public folder
  // Remotion will serve files from presentationDir as the root
  for (const slide of timeline.slides) {
    // imagePath from parser is like "images/the-task.png"
    // Make it relative to presentationDir (for Remotion's publicDir)
    if (!slide.imagePath.startsWith('/')) {
      slide.imagePath = slide.imagePath;  // Keep relative
    } else {
      // Already absolute, make relative to presentationDir
      slide.imagePath = slide.imagePath.replace(presentationDir + '/', '');
    }

    // audioPath from manifest is absolute, make relative
    if (slide.audioPath.startsWith(presentationDir)) {
      slide.audioPath = slide.audioPath.replace(presentationDir + '/', '');
    } else if (slide.audioPath.startsWith('/')) {
      // Use just the filename for audio
      slide.audioPath = 'audio/' + slide.audioPath.split('/').pop();
    }
  }

  console.log(summarizeTimeline(timeline));
  console.log('');

  // Step 4: Write timeline for manual Remotion render
  const timelineOutputPath = join(dirname(outputPath), 'timeline.json');
  const timelineData = JSON.stringify(
    {
      ...timeline,
      slides: timeline.slides.map((s) => ({
        ...s,
        // Ensure captions are JSON-serializable
        captions: s.captions || [],
      })),
    },
    null,
    2,
  );

  const { writeFileSync: writeFs, mkdirSync } = await import('node:fs');
  mkdirSync(dirname(timelineOutputPath), { recursive: true });
  writeFs(timelineOutputPath, timelineData);
  console.log(`Step 5: Timeline written to ${timelineOutputPath}`);
  console.log('');

  // Step 6: Render video with Remotion CLI
  console.log('Step 6: Rendering video with Remotion CLI...');
  console.log('  (This may take several minutes)');
  console.log('');

  try {
    const { execSync } = await import('node:child_process');
    const entryPoint = join(import.meta.dirname, '..', 'src', 'renderers', 'remotion', 'Root.tsx');

    // Prepare props for Remotion
    const propsJson = JSON.stringify({
      timeline: {
        ...timeline,
        slides: timeline.slides.map((s) => ({
          ...s,
          captions: s.captions || [],
        })),
      },
      assetsPath: presentationDir,
    });

    // Write props to temp file
    const propsFile = join(dirname(outputPath), 'remotion-props.json');
    writeFs(propsFile, propsJson);

    console.log(`Entry point: ${entryPoint}`);
    console.log(`Props file: ${propsFile}`);
    console.log(`Public dir: ${presentationDir}`);

    // Run Remotion CLI
    const cmd = [
      'npx', 'remotion', 'render',
      entryPoint,
      'Presentation',
      outputPath,
      `--props="${propsFile}"`,
      `--public-dir="${presentationDir}"`,
      '--codec=h264',
      '--crf=23',
    ].join(' ');

    console.log(`\nRunning: ${cmd}\n`);

    execSync(cmd, {
      stdio: 'inherit',
      cwd: join(import.meta.dirname, '..'),
    });

    console.log('\n');
    console.log('=== Video Render Complete ===');
    console.log(`Output: ${outputPath}`);
    console.log(`Duration: ${timeline.totalDuration.toFixed(1)}s`);
  } catch (error) {
    console.error('\nVideo render failed. Timeline has been saved for manual rendering.');
    console.error('Error:', error instanceof Error ? error.message : error);
    console.log('');
    console.log('To render manually with Remotion:');
    console.log(`  1. Review the timeline at: ${timelineOutputPath}`);
    console.log('  2. Use the Remotion CLI or studio to render');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
