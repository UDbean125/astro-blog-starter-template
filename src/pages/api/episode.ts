import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const EPISODES_DIR = path.join(DATA_DIR, 'episodes');
const EPISODES_JSON = path.join(DATA_DIR, 'episodes.json');

interface Episode {
  id: string;
  title: string;
  description: string;
  filename: string;
  fileSize: number;
  pubDate: string;
  duration: number;
  categories: string[];
}

function readEpisodes(): Episode[] {
  try {
    return JSON.parse(fs.readFileSync(EPISODES_JSON, 'utf-8'));
  } catch {
    return [];
  }
}

function writeEpisodes(episodes: Episode[]) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(EPISODES_JSON, JSON.stringify(episodes, null, 2));
}

// GET: list all episodes
export const GET: APIRoute = async () => {
  const episodes = readEpisodes();
  return new Response(JSON.stringify(episodes), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// POST: save a new episode (receives audio blob + metadata)
export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const categories = formData.get('categories') as string;

    if (!audioFile || !title) {
      return new Response(JSON.stringify({ error: 'Audio file and title required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    fs.mkdirSync(EPISODES_DIR, { recursive: true });

    const id = Date.now().toString(36);
    const filename = `episode-${id}.mp3`;
    const filepath = path.join(EPISODES_DIR, filename);

    // Save audio file
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    // Estimate duration from file size (48kbps MP3 = 6000 bytes/sec)
    const duration = Math.round(buffer.length / 6000);

    const episode: Episode = {
      id,
      title,
      description: description || '',
      filename,
      fileSize: buffer.length,
      pubDate: new Date().toUTCString(),
      duration,
      categories: categories ? categories.split(',') : [],
    };

    const episodes = readEpisodes();
    episodes.unshift(episode);
    writeEpisodes(episodes);

    return new Response(JSON.stringify({ success: true, episode }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Save episode error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Failed to save episode' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
