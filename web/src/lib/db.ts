// Thin client over Supabase's PostgREST endpoint. No SDK — plain fetch keeps
// the bundle tiny and runs identically on Node (dev) and Cloudflare Workers.

const SUPA_URL = import.meta.env.PUBLIC_SUPABASE_URL as string;
const KEY = import.meta.env.PUBLIC_SUPABASE_KEY as string;

export type PostType = "tool" | "news";

export interface Post {
  id: string;
  slug: string;
  type: PostType;
  title: string;
  blurb: string | null;
  tool_url: string | null;
  article: string | null;
  ig_permalink: string | null;
  clicks: number;
  published_at: string;
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  Accept: "application/json",
};

const FEED_COLS = "id,slug,type,title,blurb,tool_url,article,ig_permalink,clicks,published_at";

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

/** Newest first. Only rows that have actually been published. */
export async function listPosts(): Promise<Post[]> {
  return rest<Post[]>(
    `reel_posts?select=${FEED_COLS}&published_at=not.is.null&order=published_at.desc&limit=200`,
  );
}

export async function getPost(slug: string): Promise<Post | null> {
  const rows = await rest<Post[]>(`reel_posts?select=${FEED_COLS}&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  return rows[0] ?? null;
}

/**
 * Bump `clicks` for a tool post. Goes through the `increment_clicks` RPC
 * (security definer) because the anon key is read-only.
 * Never throws — the caller's redirect must not depend on this.
 */
export async function incrementClicks(slug: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`${SUPA_URL}/rest/v1/rpc/increment_clicks`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ p_slug: slug }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) console.warn(`[go] increment_clicks failed ${res.status}: ${await res.text()}`);
    return res.ok;
  } catch (e) {
    console.warn("[go] increment_clicks threw", e);
    return false;
  }
}

// ── helpers used by the pages ────────────────────────────────────────────────

export function hostOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2 Sep" this year, "26 Aug 2025" otherwise. */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const base = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return y === new Date().getUTCFullYear() ? base : `${base} ${y}`;
}

export function readMinutes(text: string | null): number {
  const words = (text ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
