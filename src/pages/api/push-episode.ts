/**
 * POST /api/push-episode — accepts an episode from the local pipeline.
 *
 * The local Python pipeline (bryans_daily_pipeline.py) generates episodes
 * on Bryan's Mac (no timeout constraints) and pushes them here for serving
 * via the Cloudflare Worker's feed and audio endpoints.
 *
 * Auth: requires ?key=<CRON_SECRET> query param.
 *
 * Body: JSON with:
 *   - audioBase64: string  — base64-encoded MP3 file
 *   - metadata: object     — episode metadata
 *
 * Metadata shape:
 * {
 *   title: string,
 *   description: string,
 *   showNotes?: string,
 *   script?: string,
 *   filename: string,        // e.g. "episode-2026-05-03.mp3"
 *   duration: number,        // seconds
 *   categories?: string[],
 * }
 */
import type { APIRoute } from 'astro';

interface Episode {
  id: string;
  title: string;
  description: string;
  showNotes: string;
  script: string;
  filename: string;
  fileSize: number;
  pubDate: string;
  duration: number;
  categories: string[];
}

// Also export GET so Astro registers the route
export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ endpoint: 'push-episode', method: 'POST required' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const headers = { 'Content-Type': 'application/json' };

  const runtime = (locals as any).runtime;
  const env = runtime?.env;
  const kv = env?.EPISODES_KV;

  if (!kv) {
    return new Response(JSON.stringify({ error: 'EPISODES_KV binding not available.' }), { status: 500, headers });
  }

  // Auth check
  const cronSecret = env?.CRON_SECRET;
  if (cronSecret) {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (key !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
    }
  }

  try {
    const body = await request.json();
    const { audioBase64, metadata: meta } = body;

    if (!audioBase64) {
      return new Response(JSON.stringify({ error: 'Missing "audioBase64" in request body.' }), { status: 400, headers });
    }
    if (!meta) {
      return new Response(JSON.stringify({ error: 'Missing "metadata" in request body.' }), { status: 400, headers });
    }

    const filename = meta.filename || `episode-${Date.now().toString(36)}.mp3`;
    const id = filename.replace('episode-', '').replace('.mp3', '');

    // Decode base64 audio
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const audioBuffer = bytes.buffer;

    // Store audio in KV
    await kv.put(`audio:${filename}`, audioBuffer);

    // Build episode object
    const episode: Episode = {
      id,
      title: meta.title || `Bryan's Daily Briefing`,
      description: meta.description || '',
      showNotes: meta.showNotes || meta.description || '',
      script: meta.script || '',
      filename,
      fileSize: audioBuffer.byteLength,
      pubDate: new Date().toUTCString(),
      duration: meta.duration || Math.round(audioBuffer.byteLength / 16000),
      categories: meta.categories || [],
    };

    // Add to episodes array (prepend)
    const episodes: Episode[] = (await kv.get('episodes', { type: 'json' })) || [];

    // Deduplicate: remove any existing episode for the same date
    const todayStr = new Date().toISOString().slice(0, 10);
    const filtered = episodes.filter((ep: Episode) => {
      try {
        return new Date(ep.pubDate).toISOString().slice(0, 10) !== todayStr;
      } catch { return true; }
    });

    filtered.unshift(episode);
    await kv.put('episodes', JSON.stringify(filtered));

    // Log success
    try {
      const logs: any[] = (await kv.get('generation_log', { type: 'json' })) || [];
      logs.unshift({
        jobId: `push-${id}`,
        status: 'complete',
        source: 'local-pipeline',
        timestamp: new Date().toISOString(),
        result: { title: episode.title, fileSize: audioBuffer.byteLength },
      });
      await kv.put('generation_log', JSON.stringify(logs.slice(0, 30)));
    } catch { /* non-critical */ }

    return new Response(JSON.stringify({
      ok: true,
      message: `Episode published: ${episode.title}`,
      id: episode.id,
      filename: episode.filename,
      fileSize: audioBuffer.byteLength,
    }), { headers });

  } catch (err: any) {
    return new Response(JSON.stringify({
      error: `Push failed: ${err?.message || 'Unknown error'}`,
    }), { status: 500, headers });
  }
};
