#!/usr/bin/env python3
"""faster-whisper word-level transcription -> JSON on stdout.
Usage: python3 whisper_transcribe.py <audio.wav>
Output: [{"text": "...", "startMs": 0, "endMs": 340}, ...]
"""
import sys, json
from faster_whisper import WhisperModel

def main():
    if len(sys.argv) < 2:
        print("[]"); return
    audio = sys.argv[1]
    # "base"/"small" are light enough for the old laptop; bump to "medium" if RAM allows.
    model = WhisperModel("small", device="cpu", compute_type="int8")
    segments, _ = model.transcribe(audio, word_timestamps=True)
    words = []
    for seg in segments:
        for w in (seg.words or []):
            words.append({
                "text": w.word.strip(),
                "startMs": int(w.start * 1000),
                "endMs": int(w.end * 1000),
            })
    print(json.dumps(words))

if __name__ == "__main__":
    main()
