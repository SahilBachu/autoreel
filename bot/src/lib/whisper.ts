import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { REPO_ROOT } from "../config.js";

export type Word = { text: string; startMs: number; endMs: number };

// Runs scripts/whisper_transcribe.py (faster-whisper) on a wav and returns word timings.
// Extract the wav first, e.g.:
//   npx remotion ffmpeg -i clip.mp4 -ar 16000 -ac 1 -y audio.wav   (in studio/)
export function transcribe(wavPath: string): Promise<Word[]> {
  const script = resolve(REPO_ROOT, "scripts/whisper_transcribe.py");
  // faster-whisper lives in a dedicated venv on the runner (system python3 lacks it).
  // Point WHISPER_PYTHON at that interpreter; fall back to python3 elsewhere.
  const python = process.env.WHISPER_PYTHON || "python3";
  return new Promise((res, rej) => {
    const p = spawn(python, [script, wavPath]);
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", rej);
    p.on("close", (code) =>
      code === 0 ? res(JSON.parse(out) as Word[]) : rej(new Error(`whisper failed: ${err}`)),
    );
  });
}
