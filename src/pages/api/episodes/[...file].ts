import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

const EPISODES_DIR = path.join(process.cwd(), 'data', 'episodes');

export const GET: APIRoute = async ({ params }) => {
  const filename = params.file;
  if (!filename || !filename.endsWith('.mp3')) {
    return new Response('Not found', { status: 404 });
  }

  // Prevent directory traversal
  const safe = path.basename(filename);
  const filepath = path.join(EPISODES_DIR, safe);

  if (!fs.existsSync(filepath)) {
    return new Response('Not found', { status: 404 });
  }

  const buffer = fs.readFileSync(filepath);
  return new Response(buffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length.toString(),
      'Accept-Ranges': 'bytes',
    },
  });
};
