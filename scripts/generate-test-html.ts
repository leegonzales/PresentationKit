#!/usr/bin/env npx tsx
/**
 * Generate a test HTML presentation from the sample talk track.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseTalkTrack } from '../src/parsers/talk-track.js';
import { renderHtmlPresentation } from '../src/renderers/html/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  // Read sample talk track
  const talkTrackPath = join(__dirname, '../tests/fixtures/sample-talk-track.md');
  const content = readFileSync(talkTrackPath, 'utf-8');

  // Parse it
  const talkTrack = parseTalkTrack(content);
  console.log(`Parsed: ${talkTrack.title}`);
  console.log(`Slides: ${talkTrack.slides.length}`);
  console.log(`Sections: ${talkTrack.sections.length}`);

  // Generate placeholder images for each slide
  const outputDir = join(__dirname, '../test-output');
  const imagesDir = join(outputDir, 'images');
  mkdirSync(imagesDir, { recursive: true });

  for (const slide of talkTrack.slides) {
    const placeholderSvg = generatePlaceholderSlide(slide.title, slide.position);
    // Replace .png with .svg for proper browser rendering
    const svgFilename = slide.image.replace(/\.png$/, '.svg');
    writeFileSync(join(imagesDir, svgFilename), placeholderSvg);
    console.log(`  Created: ${svgFilename}`);

    // Update the slide definition to use .svg
    slide.image = svgFilename;
  }

  // Render HTML (no audio timeline)
  const outputPath = join(outputDir, 'presentation.html');
  await renderHtmlPresentation(talkTrack, null, outputPath);

  console.log(`\nGenerated: ${outputPath}`);
  console.log('\nOpen in browser:');
  console.log(`  open ${outputPath}`);
}

function generatePlaceholderSlide(title: string, position: string): string {
  // Generate a simple SVG placeholder
  const colors = ['#557373', '#6B4C4C', '#4C6B5D', '#5D4C6B', '#666666'];
  const colorIndex = parseInt(position.replace(/\D/g, '') || '1') % colors.length;
  const bgColor = colors[colorIndex];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#bg)"/>
  <text x="960" y="480" text-anchor="middle" fill="white" font-family="system-ui, sans-serif" font-size="72" font-weight="bold">
    Slide ${position}
  </text>
  <text x="960" y="580" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="system-ui, sans-serif" font-size="36">
    ${escapeXml(title)}
  </text>
  <text x="960" y="700" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-family="system-ui, sans-serif" font-size="24">
    PresentationKit Test
  </text>
</svg>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

main().catch(console.error);
