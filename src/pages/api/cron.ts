/**
 * Cron endpoint — called by Cloudflare Cron Trigger daily at 11:00 UTC (7:00 AM ET).
 * Also available as GET /api/cron for manual testing.
 *
 * CRITICAL FIX (2026-05-03): Replaced internal self-fetch with direct POST to /api/podcast.
 * Self-fetches within the same Cloudflare Worker can hang or loop, causing HTTP 000 timeouts.
 * Now uses a simple fetch with explicit AbortController timeout.
 */
import type { APIRoute } from 'astro';

const ALL_CATEGORIES = ['ai', 'apple', 'autodesk', 'detroit_sports', 'college_sports'];

/**
 * GET /api/cron — triggers daily episode generation and returns immediately.
 * Requires ?key=<CRON_SECRET> query param if CRON_SECRET env var is set.
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const headers = { 'Content-Type': 'application/json' };
  const startTime = Date.now();

  try {
    const runtime = (locals as any).runtime;
    const env = runtime?.env;

    // Optional auth check
    const cronSecret = env?.CRON_SECRET;
    if (cronSecret) {
      const url = new URL(request.url);
      const key = url.searchParams.get('key');
      if (key !== cronSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
      }
    }

    const kv = env?.EPISODES_KV;
    if (!kv) {
      return new Response(JSON.stringify({
        ok: false,
        message: 'EPISODES_KV binding not available. Check wrangler.json kv_namespaces config.',
      }), { status: 500, headers });
    }

    // Quick check: does today's episode already exist?
    const episodes: any[] = (await kv.get('episodes', { type: 'json' })) || [];
    const today = new Date().toISOString().slice(0, 10);
    const hasToday = episodes.some((ep: any) => {
      if (!ep.pubDate) return false;
      try {
        return new Date(ep.pubDate).toISOString().slice(0, 10) === today;
      } catch { return false; }
    });

    if (hasToday) {
      return new Response(JSON.stringify({
        ok: true,
        message: `Episode already exists for ${today}. Skipping.`,
        elapsed: `${Date.now() - startTime}ms`,
      }), { headers });
    }

    // Check required API keys
    const apiKey = env?.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({
        ok: false,
        message: 'ANTHROPIC_API_KEY not configured. Set it in Cloudflare Dashboard > Workers > Settings > Variables.',
      }), { status: 500, headers });
    }

    const elevenLabsKey = env?.ELEVENLABS_API_KEY || '';
    if (!elevenLabsKey) {
      return new Response(JSON.stringify({
        ok: false,
        message: 'ELEVENLABS_API_KEY not configured. Set it in Cloudflare Dashboard > Workers > Settings > Variables.',
      }), { status: 500, headers });
    }

    // Fire the generation request via POST to /api/podcast
    // Use the request origin to construct the URL — works for both custom domains and workers.dev
    const baseUrl = new URL(request.url).origin;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout — must respond before Workers' 30s wall clock

    try {
      const response = await fetch(`${baseUrl}/api/podcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories: ALL_CATEGORIES,
          voice: 'elevenlabs-bryan',
          force: false,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const contentType = response.headers.get('content-type') || '';

      // Detect the HTML-instead-of-JSON failure mode (stale Astro build)
      if (!contentType.includes('application/json')) {
        const body = await response.text();
        return new Response(JSON.stringify({
          ok: false,
          message: `Internal /api/podcast returned ${contentType} (${body.length} bytes) instead of JSON. Worker needs redeployment: cd "Hennigan's Huddle" && pnpm build && npx wrangler deploy`,
          elapsed: `${Date.now() - startTime}ms`,
        }), { status: 500, headers });
      }

      const data: any = await response.json();

      if (!response.ok) {
        return new Response(JSON.stringify({
          ok: false,
          message: data.error || `POST /api/podcast failed with ${response.status}`,
          elapsed: `${Date.now() - startTime}ms`,
        }), { status: 500, headers });
      }

      // Return immediately with the jobId — generation continues in background via waitUntil
      return new Response(JSON.stringify({
        ok: true,
        message: data.jobId
          ? `Generation started. Job ID: ${data.jobId}. Check /api/podcast-status?jobId=${data.jobId} for progress.`
          : data.message || 'Request sent',
        jobId: data.jobId || null,
        elapsed: `${Date.now() - startTime}ms`,
      }), { headers });

    } catch (fetchErr: any) {
      clearTimeout(timeout);
      const isAbort = fetchErr?.name === 'AbortError';
      return new Response(JSON.stringify({
        ok: false,
        message: isAbort
          ? 'Internal /api/podcast timed out after 25s. The Worker may be overloaded or need redeployment.'
          : `Internal fetch to /api/podcast failed: ${fetchErr?.message || 'Unknown error'}`,
        elapsed: `${Date.now() - startTime}ms`,
      }), { status: 500, headers });
    }

  } catch (err: any) {
    return new Response(JSON.stringify({
      ok: false,
      message: `Cron handler error: ${err?.message || 'Unknown error'}`,
      elapsed: `${Date.now() - startTime}ms`,
    }), { status: 500, headers });
  }
};
