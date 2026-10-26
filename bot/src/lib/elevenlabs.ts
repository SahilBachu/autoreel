import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { REPO_ROOT } from "../config.js";

// ELEVENLABS VOICE for the faceless explainer series, on a hard budget.
//
// sahil's plan is the $5 tier and he set the rule: never past ELEVENLABS_MONTHLY_CREDIT_CAP
// (10,000) credits in a calendar month (UTC). Before every paid call we ask ElevenLabs what the
// ACCOUNT has spent this month (usage/character-stats reports credits, so flash's half rate is
// already counted) and refuse if this request would cross the cap. If that endpoint is down we
// fall back to our own ledger. Every result is cached by (voice, model, settings, text), so a
// re-render never pays twice.
//
// The key can read voices + usage and do TTS; it can't read the subscription (user_read) or the
// model list (models_read), and nothing here needs them.

const API = "https://api.elevenlabs.io";
const LEDGER = resolve(REPO_ROOT, "bot/data/elevenlabs-ledger.json");
const CACHE_DIR = resolve(REPO_ROOT, "bot/data/tts-cache");

// credits per character (ElevenLabs pricing): the v2/v3 quality models cost 1, flash/turbo 0.5
const RATE: Record<string, number> = {
  eleven_multilingual_v2: 1,
  eleven_v3: 1,
  eleven_flash_v2_5: 0.5,
  eleven_turbo_v2_5: 0.5,
};

export type VoiceSettings = { stability?: number; similarity_boost?: number; style?: number; use_speaker_boost?: boolean; speed?: number };
export type TtsWord = { text: string; startMs: number; endMs: number };
export type TtsResult = { mp3Path: string; words: TtsWord[]; durationMs: number; credits: number; cached: boolean };

const key = () => {
  const k = process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error("ELEVENLABS_API_KEY is not set");
  return k;
};
export const monthlyCap = () => Number(process.env.ELEVENLABS_MONTHLY_CREDIT_CAP) || 10_000;
export const creditsFor = (text: string, model: string) => Math.ceil(text.length * (RATE[model] ?? 1));

const monthKey = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

type Ledger = Record<string, { credits: number; calls: number }>;
function readLedger(): Ledger {
  try {
    return JSON.parse(readFileSync(LEDGER, "utf8"));
  } catch {
    return {};
  }
}
function addToLedger(credits: number) {
  const l = readLedger();
  const m = monthKey();
  l[m] = { credits: (l[m]?.credits ?? 0) + credits, calls: (l[m]?.calls ?? 0) + 1 };
  mkdirSync(dirname(LEDGER), { recursive: true });
  writeFileSync(LEDGER, JSON.stringify(l, null, 2));
}

/** What the whole account has spent this calendar month (UTC), per ElevenLabs; our ledger if that fails. */
export async function creditsUsedThisMonth(): Promise<{ used: number; source: "elevenlabs" | "ledger" }> {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  try {
    const r = await fetch(`${API}/v1/usage/character-stats?start_unix=${start}&end_unix=${Date.now()}&aggregation_interval=day`, {
      headers: { "xi-api-key": key() },
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) throw new Error(`usage ${r.status}`);
    const j = (await r.json()) as { usage?: Record<string, number[]> };
    const used = (j.usage?.All ?? Object.values(j.usage ?? {})[0] ?? []).reduce((a, b) => a + (b || 0), 0);
    // never trust a number lower than what we know we spent ourselves
    return { used: Math.max(used, readLedger()[monthKey()]?.credits ?? 0), source: "elevenlabs" };
  } catch {
    return { used: readLedger()[monthKey()]?.credits ?? 0, source: "ledger" };
  }
}

export class BudgetError extends Error {}

/** Throws BudgetError if `credits` more would cross the monthly cap. */
export async function assertBudget(credits: number): Promise<{ used: number; left: number }> {
  const { used } = await creditsUsedThisMonth();
  const cap = monthlyCap();
  if (used + credits > cap)
    throw new BudgetError(`ElevenLabs budget: ${used}/${cap} credits used this month; this needs ${credits}. Not generating.`);
  return { used, left: cap - used - credits };
}

// character alignment -> words (whitespace-separated, punctuation stays on its word)
function toWords(chars: string[], starts: number[], ends: number[]): TtsWord[] {
  const out: TtsWord[] = [];
  let cur: TtsWord | null = null;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (/\s/.test(c)) {
      if (cur) out.push(cur);
      cur = null;
      continue;
    }
    const s = Math.round(starts[i] * 1000), e = Math.round(ends[i] * 1000);
    if (!cur) cur = { text: c, startMs: s, endMs: e };
    else {
      cur.text += c;
      cur.endMs = e;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Text -> mp3 + word timings, via /with-timestamps. `outPath` is where the mp3 should end up
 * (e.g. studio/public/explainer/<id>/voice.mp3). Budget-checked and cached.
 */
export async function tts(
  text: string,
  outPath: string,
  opts: { voiceId: string; model?: string; settings?: VoiceSettings; previousText?: string; nextText?: string },
): Promise<TtsResult> {
  const model = opts.model ?? "eleven_multilingual_v2";
  const settings = opts.settings ?? { stability: 0.45, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true };
  const hash = createHash("sha1").update(JSON.stringify([opts.voiceId, model, settings, text, opts.previousText, opts.nextText])).digest("hex").slice(0, 16);
  const cacheMp3 = resolve(CACHE_DIR, `${hash}.mp3`);
  const cacheJson = resolve(CACHE_DIR, `${hash}.json`);
  mkdirSync(dirname(outPath), { recursive: true });

  if (existsSync(cacheMp3) && existsSync(cacheJson)) {
    writeFileSync(outPath, readFileSync(cacheMp3));
    const meta = JSON.parse(readFileSync(cacheJson, "utf8"));
    return { mp3Path: outPath, words: meta.words, durationMs: meta.durationMs, credits: 0, cached: true };
  }

  const credits = creditsFor(text, model);
  await assertBudget(credits);

  const r = await fetch(`${API}/v1/text-to-speech/${opts.voiceId}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key(), "content-type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: settings,
      ...(opts.previousText ? { previous_text: opts.previousText } : {}),
      ...(opts.nextText ? { next_text: opts.nextText } : {}),
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!r.ok) throw new Error(`ElevenLabs TTS ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = (await r.json()) as {
    audio_base64: string;
    alignment?: { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };
  };
  addToLedger(credits);
  const audio = Buffer.from(j.audio_base64, "base64");
  const a = j.alignment;
  const words = a ? toWords(a.characters, a.character_start_times_seconds, a.character_end_times_seconds) : [];
  const durationMs = a?.character_end_times_seconds.length ? Math.round(a.character_end_times_seconds[a.character_end_times_seconds.length - 1] * 1000) : 0;

  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cacheMp3, audio);
  writeFileSync(cacheJson, JSON.stringify({ words, durationMs, voiceId: opts.voiceId, model, credits, text }));
  writeFileSync(outPath, audio);
  return { mp3Path: outPath, words, durationMs, credits, cached: false };
}
