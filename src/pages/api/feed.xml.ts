import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';

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
    const file = path.join(process.cwd(), 'data', 'episodes.json');
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const GET: APIRoute = async ({ request }) => {
  // Use public URL, not the internal proxy URL
  const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : 'https://podcast.hhsolutions.cloud';
  const episodes = readEpisodes();

  const items = episodes.map(ep => `
    <item>
      <title>${escapeXml(ep.title)}</title>
      <description>${escapeXml(ep.description)}</description>
      <enclosure url="${baseUrl}/api/episodes/${ep.filename}" length="${ep.fileSize}" type="audio/mpeg"/>
      <pubDate>${ep.pubDate}</pubDate>
      <itunes:duration>${formatDuration(ep.duration)}</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
      <guid isPermaLink="false">${ep.id}</guid>
    </item>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.apple.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Bryan's Daily Podcast</title>
    <link>https://henbusinesssolutions.com</link>
    <language>en-us</language>
    <description>Your personalized daily news briefing covering AI, Apple, Autodesk, and sports.</description>
    <itunes:author>Bryan Hennigan</itunes:author>
    <itunes:summary>A personalized 10-minute news podcast generated on demand, covering AI and Claude Code, Apple, Graitec and Autodesk, Detroit sports, and college sports.</itunes:summary>
    <itunes:category text="News">
      <itunes:category text="Daily News"/>
    </itunes:category>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
};
