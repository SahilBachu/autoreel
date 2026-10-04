import { readFile } from "node:fs/promises";

// VOICE GAIN, measured per clip. The renderer used to boost every voice by a fixed 2.8x — set
// back when clips were recorded quietly. His phone-down recordings come in far hotter (the cf
// clip is ≈ -13.6 LUFS), so 2.8x drove peaks to +8.5 dBFS and hard-clipped 3.8% of samples:
// audible crunch on every loud word, in every reel.
//
// Now: read the 16 kHz mono WAV that whisper already gets, measure the speech level (RMS over
// 50 ms windows, gated so silences between sentences don't drag it down) and the true sample
// peak, and pick the gain that lands the speech at TARGET_RMS_DB — capped so the loudest peak
// stays under PEAK_CEILING. Music and SFX are then set RELATIVE to that voice (mixLevels below),
// so every reel gets the same balance whatever the track or the recording.

export const LEGACY_BOOST = 2.8; // the old fixed voice boost — the fallback when measuring fails
export const TARGET_RMS_DB = -16; // speech level after gain (dBFS, gated RMS) — lands the mix near -14 LUFS, where IG reels sit
const PEAK_CEILING = 0.89; // -1 dBFS
const GATE_DB = -45; // windows quieter than this are pauses, not speech
const MIN_GAIN = 0.35;
const MAX_GAIN = 4;

export type VoiceLevel = { rmsDb: number; peak: number; gain: number };

export async function measureVoice(wavPath: string): Promise<VoiceLevel | undefined> {
  let buf: Buffer;
  try {
    buf = await readFile(wavPath);
  } catch {
    return undefined;
  }
  // find the "data" chunk (ffmpeg writes a LIST chunk before it)
  let off = 12;
  let dataStart = -1;
  let dataLen = 0;
  let rate = 16000;
  let bits = 16;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    const len = buf.readUInt32LE(off + 4);
    if (id === "fmt ") {
      rate = buf.readUInt32LE(off + 12);
      bits = buf.readUInt16LE(off + 22);
    }
    if (id === "data") {
      dataStart = off + 8;
      dataLen = Math.min(len, buf.length - dataStart);
      break;
    }
    off += 8 + len + (len % 2);
  }
  if (dataStart < 0 || bits !== 16) return undefined;

  const n = Math.floor(dataLen / 2);
  const win = Math.max(1, Math.round(rate * 0.05));
  let peak = 0;
  let sumSq = 0;
  let counted = 0;
  for (let w = 0; w + win <= n; w += win) {
    let s = 0;
    for (let i = w; i < w + win; i++) {
      const v = buf.readInt16LE(dataStart + i * 2) / 32768;
      s += v * v;
      const a = Math.abs(v);
      if (a > peak) peak = a;
    }
    const rms = Math.sqrt(s / win);
    if (20 * Math.log10(rms + 1e-9) > GATE_DB) {
      sumSq += s;
      counted += win;
    }
  }
  if (!counted || peak <= 0) return undefined;
  const rmsDb = 20 * Math.log10(Math.sqrt(sumSq / counted));
  const byLevel = Math.pow(10, (TARGET_RMS_DB - rmsDb) / 20);
  const byPeak = PEAK_CEILING / peak;
  const gain = Math.max(MIN_GAIN, Math.min(MAX_GAIN, byLevel, byPeak));
  return { rmsDb: Math.round(rmsDb * 10) / 10, peak: Math.round(peak * 1000) / 1000, gain: Math.round(gain * 100) / 100 };
}

// THE MIX, relative to the normalised voice. On his clips integrated loudness reads 3.4 dB above
// this gated RMS (three clips, all within 0.1 dB), so a voice at TARGET_RMS_DB is ≈ -12.6 LUFS;
// most clips are peak-limited a dB or two below that. The bed sits BED_UNDER_VOICE_DB under it (bed.ts lifts it a little in pauses);
// the SFX policy (studio/src/auto/sound.ts) is calibrated to that same voice, so it only needs
// sfxGainDb when the voice couldn't reach its target (peak-limited → quieter → everything
// follows it down).
export const VOICE_LUFS = TARGET_RMS_DB + 3.4;
export const BED_UNDER_VOICE_DB = 16;
const DEFAULT_TRACK_LUFS = -14; // an unmeasured track: typical for a mastered stock bed

export function mixLevels(level: VoiceLevel | undefined, trackLufs?: number): { musicVolume: number; sfxGainDb: number } {
  const offsetDb = level ? level.rmsDb + 20 * Math.log10(level.gain) - TARGET_RMS_DB : 0;
  const bedLufs = VOICE_LUFS + offsetDb - BED_UNDER_VOICE_DB;
  const musicVolume = Math.min(1, Math.pow(10, (bedLufs - (trackLufs ?? DEFAULT_TRACK_LUFS)) / 20));
  return { musicVolume: Math.round(musicVolume * 1000) / 1000, sfxGainDb: Math.round(Math.min(0, offsetDb) * 10) / 10 };
}
