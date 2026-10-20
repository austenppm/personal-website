// Cloudflare Pages Function: GET /api/lotto/<mini|loto6|loto7>
// Live draw history for the lotto tool (the CSV source has no CORS).
// Upstream is cached at Cloudflare's edge for 30 minutes.

import { SOURCES, fetchDraws } from "../../../scripts/lotto-source.mjs";

export async function onRequestGet({ params }) {
  const key = params.game;
  if (!(key in SOURCES)) return new Response("unknown game", { status: 404 });
  try {
    const data = await fetchDraws(key, { cf: { cacheTtl: 1800, cacheEverything: true } });
    return Response.json(data, { headers: { "Cache-Control": "public, max-age=600" } });
  } catch (e) {
    return new Response(`upstream error: ${e.message}`, { status: 502 });
  }
}
