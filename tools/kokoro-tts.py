#!/usr/bin/env python3
"""
Batch Kokoro TTS — direct mlx_audio synthesis, no daemon needed.

Reads a JSON manifest from stdin:
{
  "model": "mlx-community/Kokoro-82M-bf16",
  "segments": [
    {"text": "Hello world", "voice": "af_heart", "speed": 1.0, "output_dir": "/tmp/seg0"},
    ...
  ]
}

Writes JSON results to stdout:
[
  {"index": 0, "files": ["/tmp/seg0/audio_000.wav"]},
  ...
]

Model is loaded once and reused for all segments.
"""
import json
import sys
from pathlib import Path


def main():
    manifest = json.load(sys.stdin)
    model_id = manifest.get("model", "mlx-community/Kokoro-82M-bf16")
    segments = manifest.get("segments", [])

    if not segments:
        json.dump([], sys.stdout)
        return

    from mlx_audio.tts.generate import generate_audio

    results = []
    for i, seg in enumerate(segments):
        output_dir = seg["output_dir"]
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        text = seg["text"].strip()
        if not text:
            results.append({"index": i, "files": []})
            continue

        try:
            generate_audio(
                text=text,
                model=model_id,
                voice=seg.get("voice", "af_heart"),
                speed=seg.get("speed", 1.0),
                output_path=output_dir,
                file_prefix="audio",
                audio_format="wav",
                verbose=False,
            )
        except Exception as e:
            print(f"[{i+1}/{len(segments)}] ERROR: {e}", file=sys.stderr)
            results.append({"index": i, "files": [], "error": str(e)})
            continue

        # Collect generated files
        wavs = sorted(Path(output_dir).glob("audio_*.wav"))
        results.append({"index": i, "files": [str(p) for p in wavs]})

        print(
            f"[{i+1}/{len(segments)}] {len(wavs)} chunk(s) for {len(text)} chars",
            file=sys.stderr,
        )

    json.dump(results, sys.stdout)


if __name__ == "__main__":
    main()
