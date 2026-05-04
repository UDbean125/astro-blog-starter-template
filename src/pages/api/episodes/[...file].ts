import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, request, locals }) => {
  const filename = params.file;
  if (!filename || !filename.endsWith('.mp3')) {
    return new Response('Not found', { status: 404 });
  }

  const safe = filename.split('/').pop() || filename;

  const runtime = (locals as any).runtime;
  const kv = runtime?.env?.EPISODES_KV;

  if (!kv) {
    return new Response('Storage not configured', { status: 500 });
  }

  const audioData = await kv.get(`audio:${safe}`, { type: 'arrayBuffer' });
  if (!audioData) {
    return new Response('Not found', { status: 404 });
  }

  const totalSize = audioData.byteLength;
  const rangeHeader = request.headers.get('Range');

  // Prevent Cloudflare CDN from caching audio (it strips Range headers)
  const noCdnCache = {
    'CDN-Cache-Control': 'no-store',
    'CF-Cache-Status': 'DYNAMIC',
  };

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : totalSize - 1;
      const chunkSize = end - start + 1;
      const sliced = audioData.slice(start, end + 1);

      return new Response(sliced, {
        status: 206,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': chunkSize.toString(),
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache',
          ...noCdnCache,
        },
      });
    }
  }

  return new Response(audioData, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': totalSize.toString(),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
      ...noCdnCache,
    },
  });
};
