import type { Word } from "./whisper.js";

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");

// Align the SCRIPT text (correct spelling) onto WHISPER words (correct timing).
// Whisper is great for *when* a word is said but sloppy on spelling ("Cloud" vs "Claude");
// the script is the source of truth for text. We LCS-match the two token streams, give each
// script token its matched whisper token's timing, and interpolate timing for the rest.
export function alignCaptions(script: string, words: Word[]): Word[] {
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
