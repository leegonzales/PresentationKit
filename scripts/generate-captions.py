#!/usr/bin/env python3
"""
Generate accurate caption timestamps using Whisper.

Usage: python scripts/generate-captions.py <audio-dir> <output-json>

This script transcribes audio files and generates word-level timestamps
for accurate caption synchronization in videos.
"""

import json
import sys
import os
from pathlib import Path

def transcribe_with_whisper(audio_path: str) -> dict:
    """Transcribe audio file and get word-level timestamps."""
    import torch
    from transformers import pipeline

    device = "mps" if torch.backends.mps.is_available() else "cpu"

    pipe = pipeline(
        "automatic-speech-recognition",
        model="openai/whisper-base",
        torch_dtype=torch.float16 if device == "mps" else torch.float32,
        device=device,
    )

    result = pipe(
        audio_path,
        return_timestamps="word",
        chunk_length_s=30,
    )

    return result


def process_audio_files(audio_dir: str) -> dict:
    """Process all audio files in directory."""
    audio_path = Path(audio_dir)
    results = {}

    wav_files = sorted(audio_path.glob("*.wav"))
    print(f"Found {len(wav_files)} audio files")

    for wav_file in wav_files:
        slug = wav_file.stem
        print(f"Transcribing {slug}...", end=" ", flush=True)

        try:
            result = transcribe_with_whisper(str(wav_file))

            # Extract word timings
            word_timings = []
            if "chunks" in result:
                for chunk in result["chunks"]:
                    if chunk.get("timestamp"):
                        start, end = chunk["timestamp"]
                        if start is not None and end is not None:
                            word_timings.append({
                                "word": chunk["text"].strip(),
                                "start": float(start),
                                "end": float(end),
                            })

            results[slug] = {
                "text": result.get("text", ""),
                "word_timings": word_timings,
            }
            print(f"OK ({len(word_timings)} words)")

        except Exception as e:
            print(f"FAILED: {e}")
            results[slug] = {"text": "", "word_timings": [], "error": str(e)}

    return results


def main():
    if len(sys.argv) < 3:
        print("Usage: python scripts/generate-captions.py <audio-dir> <output-json>")
        print("")
        print("Example:")
        print("  python scripts/generate-captions.py ./presentations/my-talk/audio ./captions.json")
        sys.exit(1)

    audio_dir = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.isdir(audio_dir):
        print(f"Error: {audio_dir} is not a directory")
        sys.exit(1)

    print(f"=== Whisper Caption Generator ===")
    print(f"Audio dir: {audio_dir}")
    print(f"Output: {output_path}")
    print("")

    results = process_audio_files(audio_dir)

    # Save results
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)

    print("")
    print(f"Captions saved to {output_path}")

    # Summary
    total_words = sum(len(r.get("word_timings", [])) for r in results.values())
    print(f"Total words transcribed: {total_words}")


if __name__ == "__main__":
    main()
