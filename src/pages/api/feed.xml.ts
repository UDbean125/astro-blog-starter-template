import type { APIRoute } from 'astro';

interface Episode {
  id: string;
  title: string;
  description: string;
  showNotes?: string;
  script?: string;
  filename: string;
  fileSize: number;
  pubDate: string;
  duration: number;
  categories: string[];
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

export const GET: APIRoute = async ({ request, locals }) => {
  const baseUrl = 'https://podcast.hhsolutions.cloud';
  // Audio served from same Worker via /api/episodes/[file] endpoint with KV storage.
  // Previously pointed to workers.dev subdomain which went stale.
  const audioUrl = baseUrl;

  // Read episodes from KV
  const runtime = (locals as any).runtime;
  const kv = runtime?.env?.EPISODES_KV;

  let episodes: Episode[] = [];
  if (kv) {
    try {
      episodes = (await kv.get('episodes', { type: 'json' })) || [];
    } catch {
      episodes = [];
    }
  }

  // Sort episodes by pubDate descending (newest first) BEFORE rendering
  episodes.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  // Limit to 30 most recent episodes to keep feed size manageable for Apple Podcasts
  const recentEpisodes = episodes.slice(0, 30);

  const items = recentEpisodes.map(ep => {
    const notes = ep.showNotes || ep.description;
    // Truncate show notes to avoid feed bloat — Apple recommends < 4000 chars per episode
    const truncatedNotes = notes.slice(0, 3000);
    const notesHtml = truncatedNotes.replace(/\n/g, '<br>');
    return `
    <item>
      <title>${escapeXml(ep.title)}</title>
      <description>${escapeXml(truncatedNotes)}</description>
      <content:encoded><![CDATA[<p>${notesHtml}</p>]]></content:encoded>
      <enclosure url="${audioUrl}/api/episodes/${ep.filename}" length="${ep.fileSize}" type="audio/mpeg"/>
      <pubDate>${ep.pubDate}</pubDate>
      <itunes:duration>${formatDuration(ep.duration)}</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
      <itunes:summary>${escapeXml(truncatedNotes.slice(0, 2000))}</itunes:summary>
      <link>${baseUrl}/episodes/${ep.id}</link>
      <guid isPermaLink="false">${ep.id}</guid>
    </item>`}).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>Bryan's Daily Podcast</title>
    <link>https://henbusinesssolutions.com</link>
    <atom:link href="${baseUrl}/api/feed.xml" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <description>Your 10-minute daily briefing on AI, Apple, construction tech, and Detroit sports. Hosted by Bryan Hennigan — a senior account manager in AEC software who reads everything so you don't have to. New episodes every morning at 7 AM ET.</description>
    <itunes:author>Bryan Hennigan</itunes:author>
    <itunes:summary>Start your day informed in 10 minutes. Bryan Hennigan delivers a daily briefing covering the latest in AI and Claude Code, Apple products, Autodesk and construction technology, plus Detroit Lions, Tigers, Pistons, Red Wings, Ohio State, and Dayton Flyers sports. New episodes every morning.</itunes:summary>
    <itunes:image href="${audioUrl}/podcast-cover.png"/>
    <itunes:owner>
      <itunes:name>Bryan Hennigan</itunes:name>
      <itunes:email>BryanHennigan@Hen-Solutions.com</itunes:email>
    </itunes:owner>
    <itunes:category text="News">
      <itunes:category text="Daily News"/>
    </itunes:category>
    <itunes:category text="Technology"/>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>
    <podcast:locked>no</podcast:locked>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <pubDate>${episodes.length > 0 ? new Date(episodes[0].pubDate).toUTCString() : new Date().toUTCString()}</pubDate>
    ${items}
    <item>
      <title>Welcome to Bryan's Daily Podcast</title>
      <description>Your personalized daily news briefing covering AI, Apple, Autodesk, and sports. New episodes drop daily — subscribe now!</description>
      <enclosure url="${baseUrl}/trailer.mp3" length="81127" type="audio/mpeg"/>
      <pubDate>Wed, 30 Apr 2026 12:00:00 +0000</pubDate>
      <itunes:duration>0:05</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
      <itunes:summary>Your personalized daily news briefing covering AI, Apple, Autodesk, and sports. New episodes drop daily — subscribe now!</itunes:summary>
      <itunes:episodeType>trailer</itunes:episodeType>
      <guid isPermaLink="false">trailer-001</guid>
    </item>
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
