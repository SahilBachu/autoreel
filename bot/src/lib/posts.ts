import { config } from "../config.js";
import type { PostType } from "./voice.js";

// The funnel spine: one row in Supabase `reel_posts` per published reel. The website renders
// these (web/), and the DM autoresponder (jobs/dm.ts) joins on ig_media_id to know which
// link a "TOOL" comment is asking for. Written with the service key over PostgREST — no SDK,
// same as the storage upload next door.

export type ReelPost = {
  id?: string;
  slug: string;
  type: PostType;
  title: string;
  blurb?: string;
  tool_url?: string;
  article?: string;
  script?: string;
  ig_media_id?: string;
  ig_permalink?: string;
  clicks?: number;
  published_at?: string;
};

function rest(): { url: string; headers: Record<string, string> } {
  const { url, serviceKey } = config.supabase;
  if (!url || !serviceKey) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY not set");
  return {
    url: `${url}/rest/v1/reel_posts`,
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, "content-type": "application/json" },
  };
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "") || "post";
}

/** Insert one row. A slug collision (same tool twice) gets a -2 / -3 suffix instead of failing. */
export async function insertPost(p: ReelPost): Promise<ReelPost> {
  const { url, headers } = rest();
  const baseSlug = p.slug;
  for (let n = 1; n <= 5; n++) {
    const slug = n === 1 ? baseSlug : `${baseSlug}-${n}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { ...headers, prefer: "return=representation" },
      body: JSON.stringify({ ...p, slug }),
      signal: AbortSignal.timeout(20_000),
    });
    if (r.ok) return ((await r.json()) as ReelPost[])[0];
    const text = await r.text();
    if (r.status === 409 && /slug/.test(text)) continue; // unique violation on slug — try the next suffix
    throw new Error(`reel_posts insert failed: ${r.status} ${text.slice(0, 300)}`);
  }
  throw new Error(`reel_posts insert failed: could not find a free slug for "${baseSlug}"`);
}

/** Rows written by /dryrun (slug starts with "test-", no ig_media_id). Returns how many went. */
export async function deleteTestPosts(): Promise<number> {
  const { url, headers } = rest();
  const u = new URL(url);
  u.searchParams.set("slug", "like.test-*");
  u.searchParams.set("ig_media_id", "is.null");
  const r = await fetch(u, { method: "DELETE", headers: { ...headers, prefer: "return=representation" }, signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`reel_posts delete failed: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return ((await r.json()) as unknown[]).length;
}

/** Tool posts from the last N days that made it to Instagram — the ones worth polling for
 *  TOOL comments. */
export async function recentToolPosts(days = 7): Promise<ReelPost[]> {
  const { url, headers } = rest();
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const u = new URL(url);
  u.searchParams.set("select", "id,slug,type,title,tool_url,ig_media_id,published_at");
  u.searchParams.set("type", "eq.tool");
  u.searchParams.set("ig_media_id", "not.is.null");
  u.searchParams.set("published_at", `gte.${since}`);
  u.searchParams.set("order", "published_at.desc");
  const r = await fetch(u, { headers, signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`reel_posts read failed: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return (await r.json()) as ReelPost[];
}

/** The link we hand out for a tool post. Through the site's /go/ redirect when the site is
 *  public (so the click gets counted — that number is what eventually gets tools to pay for
 *  placement); straight to the tool while the site is still on localhost. */
export function publicLinkFor(p: Pick<ReelPost, "slug" | "tool_url">): string {
  const site = config.site.url;
  if (site && !/localhost|127\.0\.0\.1/.test(site)) return `${site.replace(/\/$/, "")}/go/${p.slug}`;
  return p.tool_url ?? site;
}

export function postUrl(slug: string, type: PostType): string {
  const site = (config.site.url || "").replace(/\/$/, "");
  return type === "news" ? `${site}/p/${slug}` : `${site}/#${slug}`;
}
