/**
 * GET /api/generation-log — returns the persistent generation log from KV.
 * Shows the last 30 generation attempts with timestamps, status, and errors.
 * Useful for debugging why episodes are missing on specific days.
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const headers = { 'Content-Type': 'application/json' };

  const runtime = (locals as any).runtime;
  const kv = runtime?.env?.EPISODES_KV;

  if (!kv) {
    return new Response(JSON.stringify({ error: 'EPISODES_KV binding not available.' }), { status: 500, headers });
  }

  const log = (await kv.get('generation_log', { type: 'json' })) || [];
  const episodes: any[] = (await kv.get('episodes', { type: 'json' })) || [];

  // Also show episode dates for cross-reference
  const episodeDates = episodes.map((ep: any) => ({
    id: ep.id,
    title: ep.title,
    pubDate: ep.pubDate,
    date: ep.pubDate ? new Date(ep.pubDate).toISOString().slice(0, 10) : 'unknown',
  }));

  return new Response(JSON.stringify({
    generationLog: log,
    episodes: episodeDates,
    totalEpisodes: episodes.length,
  }, null, 2), { headers });
};
