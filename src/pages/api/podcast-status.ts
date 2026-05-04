import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, locals }) => {
  const headers = { 'Content-Type': 'application/json' };

  const runtime = (locals as any).runtime;
  const kv = runtime?.env?.EPISODES_KV;

  if (!kv) {
    return new Response(JSON.stringify({ error: 'EPISODES_KV binding not available.' }), { status: 500, headers });
  }

  const jobId = url.searchParams.get('jobId');
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'Missing jobId parameter.' }), { status: 400, headers });
  }

  const status = await kv.get(`job:${jobId}`, { type: 'json' });

  if (!status) {
    return new Response(JSON.stringify({ error: 'Job not found or expired.' }), { status: 404, headers });
  }

  return new Response(JSON.stringify(status), { headers });
};
