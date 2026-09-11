import type { APIRoute } from "astro";
import { getPost, incrementClicks } from "../../lib/db";

/**
 * /go/<slug> — click-tracked redirect for tool posts.
 *
 * Order matters: resolve the destination FIRST, then fire the counter. The
 * counter can fail (RPC missing, network blip, timeout) and the visitor still
 * lands on the tool. Tracking is best-effort; the redirect is not.
 */
export const GET: APIRoute = async ({ params, locals, redirect }) => {
  const slug = params.slug ?? "";
  const post = await getPost(slug).catch(() => null);

  if (!post || post.type !== "tool" || !post.tool_url) {
    return redirect("/", 302);
  }

  const bump = incrementClicks(slug);

  // On Cloudflare, let the Worker finish the RPC after the response is sent so
  // the redirect is instant. Anywhere else, just await it — it's ~100ms.
  const cf = (locals as { cfContext?: { waitUntil?: (p: Promise<unknown>) => void } }).cfContext;
  if (typeof cf?.waitUntil === "function") cf.waitUntil(bump);
  else await bump;

  return new Response(null, {
    status: 302,
    headers: {
      Location: post.tool_url,
      "Cache-Control": "no-store",
      "Referrer-Policy": "origin",
    },
  });
};

export const prerender = false;
