/**
 * Caption Synchronization
 *
 * Utilities for aligning captions with audio timing.
 * Handles both word-level timing (ElevenLabs) and estimation (Kokoro).
 */

import type { Caption, WordTiming } from './types.js';

/**
 * Default speaking rate in words per minute for estimation.
 * 150 WPM is a comfortable, clear speaking pace.
 */
const DEFAULT_WPM = 150;

/**
 * Minimum caption duration in seconds.
 * Ensures captions are visible long enough to read.
 */
const MIN_CAPTION_DURATION = 0.5;

/**
 * Maximum caption length in characters.
 * Longer sentences are split for readability.
 */
const MAX_CAPTION_LENGTH = 120;

/**
 * Splits text into sentences for captioning.
 * Handles common sentence-ending punctuation and edge cases.
 *
 * @param text - Raw text to split into sentences
 * @returns Array of sentence strings
 *
 * @example
 * ```typescript
 * const sentences = splitIntoSentences("Hello world. How are you? I'm fine!");
 * // ["Hello world.", "How are you?", "I'm fine!"]
 * ```
 */
export function splitIntoSentences(text: string): string[] {
  if (!text || !text.trim()) {
    return [];
  }

  // Normalize whitespace
  const normalized = text.replace(/\s+/g, ' ').trim();

  // Split on sentence-ending punctuation, keeping the punctuation
  // Handles: . ! ? and their combinations with quotes/parentheses
  const sentencePattern = /[^.!?]*[.!?]+(?:\s+|$)|[^.!?]+$/g;
  const rawSentences = normalized.match(sentencePattern) || [];

  const sentences: string[] = [];

  for (const raw of rawSentences) {
    const sentence = raw.trim();
    if (!sentence) continue;

    // If sentence is too long, split on clauses
    if (sentence.length > MAX_CAPTION_LENGTH) {
      const clauses = splitOnClauses(sentence);
      sentences.push(...clauses);
    } else {
      sentences.push(sentence);
    }
  }

  return sentences;
}

/**
 * Splits a long sentence into smaller clauses.
 * Uses comma, semicolon, colon, and conjunctions as break points.
 */
function splitOnClauses(sentence: string): string[] {
  // Try splitting on common clause delimiters
  const clausePattern = /[,;:]\s+|\s+(?:and|but|or|because|although|while|when|if)\s+/i;

  if (!clausePattern.test(sentence)) {
    // No good split points - just return as is
    return [sentence];
  }

  const parts: string[] = [];
  let currentPart = '';

  // Split while trying to keep parts under max length
  const words = sentence.split(/\s+/);
  for (const word of words) {
    const test = currentPart ? `${currentPart} ${word}` : word;

    if (test.length > MAX_CAPTION_LENGTH && currentPart) {
      parts.push(currentPart.trim());
      currentPart = word;
    } else {
      currentPart = test;
    }
  }

  if (currentPart.trim()) {
    parts.push(currentPart.trim());
  }

  return parts.filter((p) => p.length > 0);
}

/**
 * Aligns captions to audio using word-level timing from ElevenLabs.
 * Creates caption segments that match sentence boundaries.
 *
 * @param text - Original text that was spoken
 * @param wordTimings - Word-level timing data from TTS provider
 * @returns Array of aligned captions
 *
 * @example
 * ```typescript
 * const captions = alignCaptionsToAudio(
 *   "Hello world. How are you?",
 *   [
 *     { word: "Hello", start: 0.0, end: 0.3 },
 *     { word: "world.", start: 0.4, end: 0.7 },
 *     { word: "How", start: 0.9, end: 1.1 },
 *     { word: "are", start: 1.2, end: 1.3 },
 *     { word: "you?", start: 1.4, end: 1.7 },
 *   ]
 * );
 * ```
 */
export function alignCaptionsToAudio(text: string, wordTimings: WordTiming[]): Caption[] {
  if (!wordTimings || wordTimings.length === 0) {
    // Fall back to estimation if no timings
    return estimateCaptionTimings(text, 0);
  }

  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) {
    return [];
  }

  const captions: Caption[] = [];
  let timingIndex = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).filter((w) => w);
    const captionWords: WordTiming[] = [];
    let startTime: number | null = null;
    let endTime = 0;

    // Match words in sentence to word timings
    for (const sentenceWord of sentenceWords) {
      // Find matching word timing (fuzzy match to handle punctuation)
      const normalizedSentenceWord = normalizeWord(sentenceWord);

      while (timingIndex < wordTimings.length) {
        const timing = wordTimings[timingIndex];
        const normalizedTimingWord = normalizeWord(timing.word);

        if (normalizedTimingWord === normalizedSentenceWord ||
            normalizedTimingWord.includes(normalizedSentenceWord) ||
            normalizedSentenceWord.includes(normalizedTimingWord)) {
          if (startTime === null) {
            startTime = timing.start;
          }
          endTime = timing.end;
          captionWords.push({
            word: sentenceWord,
            start: timing.start,
            end: timing.end,
          });
          timingIndex++;
          break;
        }

        timingIndex++;
      }
    }

    // Create caption if we found timing data
    if (startTime !== null) {
      captions.push({
        text: sentence,
        startTime,
        endTime,
        words: captionWords,
      });
    }
  }

  return captions;
}

/**
 * Normalizes a word for fuzzy matching.
 * Removes punctuation and converts to lowercase.
 */
function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^\w]/g, '');
}

/**
 * Estimates caption timings when word-level timing is unavailable.
 * Uses a fixed words-per-minute rate for estimation.
 *
 * @param text - Text to create captions for
 * @param startOffset - Starting time offset in seconds
 * @param wpm - Words per minute rate (default: 150)
 * @returns Array of estimated captions
 *
 * @example
 * ```typescript
 * // For Kokoro TTS which doesn't provide word timings
 * const captions = estimateCaptionTimings("Hello world. How are you?", 0);
 * ```
 */
export function estimateCaptionTimings(
  text: string,
  startOffset: number = 0,
  wpm: number = DEFAULT_WPM,
): Caption[] {
  const sentences = splitIntoSentences(text);
  if (sentences.length === 0) {
    return [];
  }

  const captions: Caption[] = [];
  let currentTime = startOffset;

  // Seconds per word
  const secondsPerWord = 60 / wpm;

  for (const sentence of sentences) {
    const wordCount = sentence.split(/\s+/).filter((w) => w).length;
    const duration = Math.max(wordCount * secondsPerWord, MIN_CAPTION_DURATION);

    captions.push({
      text: sentence,
      startTime: currentTime,
      endTime: currentTime + duration,
      // No word timings for estimated captions
    });

    currentTime += duration;
  }

  return captions;
}

/**
 * Adjusts caption timings to fit within a specified duration.
 * Scales all timings proportionally to match the actual audio duration.
 *
 * @param captions - Original captions with estimated or actual timings
 * @param targetDuration - Actual audio duration in seconds
 * @returns Captions with adjusted timings
 */
export function scaleCaptionsToAudioDuration(
  captions: Caption[],
  targetDuration: number,
): Caption[] {
  if (captions.length === 0 || targetDuration <= 0) {
    return captions;
  }

  // Calculate current total duration
  const lastCaption = captions[captions.length - 1];
  const currentDuration = lastCaption.endTime;

  if (currentDuration <= 0) {
    return captions;
  }

  // Calculate scale factor
  const scale = targetDuration / currentDuration;

  return captions.map((caption) => ({
    ...caption,
    startTime: caption.startTime * scale,
    endTime: caption.endTime * scale,
    words: caption.words?.map((word) => ({
      ...word,
      start: word.start * scale,
      end: word.end * scale,
    })),
  }));
}
