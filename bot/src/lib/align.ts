import type { Word } from "./whisper.js";

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");

// Align the SCRIPT text (correct spelling) onto WHISPER words (correct timing).
// Whisper is great for *when* a word is said but sloppy on spelling ("Cloud" vs "Claude");
// the script is the source of truth for text. We LCS-match the two token streams, give each
// script token its matched whisper token's timing, and interpolate timing for the rest.
export function alignCaptions(script: string, words: Word[], opts: { syncFromAudio?: boolean } = {}): Word[] {
  // syncFromAudio: whisper's words are the backbone (so ad-libs stay in sync), with the
  // script's spelling laid over every stretch that lines up with it.
  if (opts.syncFromAudio && words.length) return spellFromScript(script, words);
  const s = script.split(/\s+/).filter(Boolean); // display tokens (script)
  const w = words;
  if (!w.length) return s.map((text, i) => ({ text, startMs: i * 300, endMs: i * 300 + 260 }));
  if (!s.length) return w;

  const a = s.map(norm);
  const b = w.map((x) => norm(x.text));

  // LCS table
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

  // backtrack -> matched pairs (scriptIndex -> whisperIndex)
  const match = new Array<number>(n).fill(-1);
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { match[i - 1] = j - 1; i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }

  // assign timings: matched tokens take the whisper timing; unmatched interpolate between anchors
  const out: Word[] = new Array(n);
  let k = 0;
  while (k < n) {
    if (match[k] >= 0) {
      out[k] = { text: s[k], startMs: w[match[k]].startMs, endMs: w[match[k]].endMs };
      k++;
    } else {
      // run of unmatched [k..r)
      let r = k;
      while (r < n && match[r] < 0) r++;
      const startMs = k > 0 ? out[k - 1].endMs : w[0].startMs;
      const endMs = r < n && match[r] >= 0 ? w[match[r]].startMs : w[w.length - 1].endMs;
      const span = Math.max(1, endMs - startMs);
      const step = span / (r - k);
      for (let x = k; x < r; x++) {
        const st = Math.round(startMs + (x - k) * step);
        out[x] = { text: s[x], startMs: st, endMs: Math.round(st + step * 0.9) };
      }
      k = r;
    }
  }
  return out;
}

// The captions follow what he actually SAID (whisper's words and timing — if he ad-libs, the
// captions ad-lib with him), but he reads from a script, so whisper's spelling mistakes have a
// source of truth: "Hirtic" → "Heretic", "Comment to will" → "comment TOOL", "CF" → "cf".
//
// Exact matches between the two streams (LCS on normalised tokens) are anchors: they take the
// script's spelling at whisper's timing. Between two anchors there's a run of whisper words and
// a run of script words that didn't match exactly:
//   • script run empty      → he said something not in the script (ad-lib/filler): keep whisper
//   • whisper run empty     → he skipped script words: nothing to show, drop them
//   • similar lengths       → the same words, misheard: the script's words, spread across the
//                             whisper run's time span in proportion to their length
//   • very different lengths → he genuinely said something else: keep whisper
const MAX_RUN = 8;
function spellFromScript(script: string, w: Word[]): Word[] {
  const s = script.split(/\s+/).filter(Boolean);
  if (!s.length) return w;
  const a = s.map(norm);
  const b = w.map((x) => norm(x.text));
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      dp[i][j] = a[i - 1] && a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const pairs: [number, number][] = [];
  let i = n, j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] && a[i - 1] === b[j - 1]) { pairs.push([i - 1, j - 1]); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  pairs.reverse();

  const out: Word[] = [];
  const fillRun = (si: number, sj: number, wi: number, wj: number) => {
    const S = s.slice(si, sj);
    const W = w.slice(wi, wj);
    if (!W.length) return; // skipped script words — nothing was said
    const similar = S.length > 0 && Math.max(S.length, W.length) <= MAX_RUN && Math.max(S.length, W.length) <= 2 * Math.min(S.length, W.length) + 1;
    if (!similar) {
      out.push(...W); // ad-lib, filler, or a different sentence: keep what he said
      return;
    }
    const start = W[0].startMs, end = W[W.length - 1].endMs;
    const weights = S.map((t) => Math.max(1, t.length));
    const total = weights.reduce((x, y) => x + y, 0);
    let t = start;
    S.forEach((text, k) => {
      const d = ((end - start) * weights[k]) / total;
      out.push({ text, startMs: Math.round(t), endMs: Math.round(t + d * 0.92) });
      t += d;
    });
  };
  let ps = 0, pw = 0;
  for (const [si, wi] of pairs) {
    fillRun(ps, si, pw, wi);
    out.push({ text: s[si], startMs: w[wi].startMs, endMs: w[wi].endMs });
    ps = si + 1;
    pw = wi + 1;
  }
  fillRun(ps, n, pw, m);
  return out;
}
