import type { APIRoute } from 'astro';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'node:fs';
import path from 'node:path';

interface NewsItem {
  title: string;
  description: string;
  source: string;
  category: string;
}

interface FeedConfig {
  name: string;
  url: string;
}

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

const DATA_DIR = path.join(process.cwd(), 'data');
const EPISODES_DIR = path.join(DATA_DIR, 'episodes');
const EPISODES_JSON = path.join(DATA_DIR, 'episodes.json');

const RSS_FEEDS: Record<string, { label: string; feeds: FeedConfig[] }> = {
  ai: {
    label: 'AI & Claude Code',
    feeds: [
      { name: 'AI - Claude/Anthropic', url: 'https://news.google.com/rss/search?q=Claude+Code+OR+Anthropic+Claude+OR+Claude+AI+agent&hl=en-US&gl=US&ceid=US:en' },
      { name: 'AI - General', url: 'https://news.google.com/rss/search?q=artificial+intelligence+capabilities+OR+AI+coding+assistant&hl=en-US&gl=US&ceid=US:en' },
    ],
  },
  apple: {
    label: 'Apple',
    feeds: [
      { name: 'Apple', url: 'https://news.google.com/rss/search?q=Apple+iPhone+OR+Apple+macOS+OR+Apple+iOS+OR+Apple+WWDC+OR+Apple+Vision+Pro&hl=en-US&gl=US&ceid=US:en' },
      { name: '9to5Mac', url: 'https://9to5mac.com/feed/' },
    ],
  },
  autodesk: {
    label: 'Graitec & Autodesk',
    feeds: [
      { name: 'Autodesk/Graitec', url: 'https://news.google.com/rss/search?q=Autodesk+OR+Graitec+OR+Revit+OR+BIM+software&hl=en-US&gl=US&ceid=US:en' },
    ],
  },
  detroit_sports: {
    label: 'Detroit Sports',
    feeds: [
      { name: 'Detroit Lions', url: 'https://news.google.com/rss/search?q=Detroit+Lions+NFL&hl=en-US&gl=US&ceid=US:en' },
      { name: 'Detroit Pistons', url: 'https://news.google.com/rss/search?q=Detroit+Pistons+NBA&hl=en-US&gl=US&ceid=US:en' },
      { name: 'Detroit Red Wings', url: 'https://news.google.com/rss/search?q=Detroit+Red+Wings+NHL&hl=en-US&gl=US&ceid=US:en' },
      { name: 'Detroit Tigers', url: 'https://news.google.com/rss/search?q=Detroit+Tigers+MLB&hl=en-US&gl=US&ceid=US:en' },
    ],
  },
  college_sports: {
    label: 'College Sports',
    feeds: [
      { name: 'Ohio State Buckeyes', url: 'https://news.google.com/rss/search?q=Ohio+State+Buckeyes+football&hl=en-US&gl=US&ceid=US:en' },
      { name: 'Dayton Flyers', url: 'https://news.google.com/rss/search?q=Dayton+Flyers+basketball&hl=en-US&gl=US&ceid=US:en' },
    ],
  },
};

const VOICES: Record<string, string> = {
  'en-US-AndrewNeural': 'Andrew (Male, US)',
  'en-US-BrianNeural': 'Brian (Male, US)',
  'en-US-ChristopherNeural': 'Christopher (Male, US)',
  'en-US-GuyNeural': 'Guy (Male, US)',
  'en-US-AriaNeural': 'Aria (Female, US)',
  'en-US-JennyNeural': 'Jenny (Female, US)',
  'en-US-AvaNeural': 'Ava (Female, US)',
  'en-US-EmmaNeural': 'Emma (Female, US)',
  'en-GB-RyanNeural': 'Ryan (Male, UK)',
  'en-GB-SoniaNeural': 'Sonia (Female, UK)',
  'en-AU-WilliamNeural': 'William (Male, AU)',
  'en-AU-NatashaNeural': 'Natasha (Female, AU)',
};

// --- Helpers ---

function extractTag(xml: string, tag: string): string {
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();
  const tagRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const tagMatch = xml.match(tagRegex);
  if (tagMatch) return tagMatch[1].trim();
  return '';
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').trim();
}

function parseRSSItems(xml: string, feedName: string, category: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 8) {
    const itemXml = match[1];
    let title = stripHtml(extractTag(itemXml, 'title'));
    const description = stripHtml(extractTag(itemXml, 'description'));
    const sourceTag = extractTag(itemXml, 'source');
    const source = sourceTag ? stripHtml(sourceTag) : feedName;
    const dashIndex = title.lastIndexOf(' - ');
    if (dashIndex > 20) title = title.substring(0, dashIndex);
    if (title) items.push({ title, description: description.slice(0, 300), source, category });
  }
  return items;
}

async function fetchFeed(url: string, name: string, category: string): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DailyDigestPodcast/1.0)', 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
    });
    clearTimeout(timeout);
    if (!response.ok) return [];
    const xml = await response.text();
    return parseRSSItems(xml, name, category);
  } catch { return []; }
}

function readEpisodes(): Episode[] {
  try { return JSON.parse(fs.readFileSync(EPISODES_JSON, 'utf-8')); } catch { return []; }
}

function getNextEpisodeNumber(): number {
  const episodes = readEpisodes();
  return episodes.length + 1;
}

function saveEpisode(episode: Episode) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const episodes = readEpisodes();
  episodes.unshift(episode);
  fs.writeFileSync(EPISODES_JSON, JSON.stringify(episodes, null, 2));
}

// --- GET: return available voices ---
export const GET: APIRoute = async () => {
  const voiceList = Object.entries(VOICES).map(([id, name]) => ({ id, name }));
  return new Response(JSON.stringify(voiceList), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// --- POST: full pipeline — news → script → audio → save episode ---
export const POST: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' };

  try {
    const body = await request.json();
    const categories: string[] = body.categories || [];
    const voice: string = body.voice || 'en-US-AndrewNeural';

    if (categories.length === 0) {
      return new Response(JSON.stringify({ error: 'Please select at least one category.' }), { status: 400, headers });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured.' }), { status: 500, headers });
    }

    // STEP 1: Fetch news
    console.log('Step 1: Fetching news...');
    const fetchPromises: Promise<NewsItem[]>[] = [];
    const selectedLabels: string[] = [];
    for (const cat of categories) {
      const config = RSS_FEEDS[cat];
      if (!config) continue;
      selectedLabels.push(config.label);
      for (const feed of config.feeds) {
        fetchPromises.push(fetchFeed(feed.url, feed.name, config.label));
      }
    }
    const results = await Promise.all(fetchPromises);
    const allItems = results.flat();
    const seen = new Set<string>();
    const uniqueItems = allItems.filter(item => {
      const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (uniqueItems.length === 0) {
      return new Response(JSON.stringify({ error: 'Could not fetch news. Try again.' }), { status: 500, headers });
    }
    console.log(`  Found ${uniqueItems.length} stories`);

    // STEP 2: Generate script with Claude
    console.log('Step 2: Generating script...');
    const grouped: Record<string, NewsItem[]> = {};
    for (const item of uniqueItems) {
      if (!grouped[item.category]) grouped[item.category] = [];
      if (grouped[item.category].length < 10) grouped[item.category].push(item);
    }
    const newsText = Object.entries(grouped)
      .map(([category, items]) => {
        const list = items.map((item, i) => `  ${i + 1}. [${item.source}] ${item.title}\n     ${item.description || 'No description.'}`).join('\n');
        return `=== ${category.toUpperCase()} ===\n${list}`;
      }).join('\n\n');

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `You are the host of "Bryan's Daily Podcast," a personalized 10-minute news briefing podcast. Generate a podcast script of approximately 1,500 words based on the news stories below.

Today's date: ${today}

STRUCTURE & TIMING:
1. OPENING (~30 seconds): Warm greeting — "Welcome to episode ${episodeNumber} of Bryan's Daily Podcast" — mention the date, and give a quick preview of what's coming up.
2. AI & TECHNOLOGY (~4 minutes): Lead with the biggest AI stories. Cover developments around Claude Code, Cowork, OpenClaw, and other major AI news. Explain capabilities and what they mean for users.
3. APPLE (~2 minutes): Apple product updates, OS releases, hardware, and ecosystem news.
4. GRAITEC & AUTODESK (~1 minute): Industry solutions, Revit/BIM updates, and AEC technology news.
5. SPORTS TICKER (~2.5 minutes): Quick-hit sports roundup:
   - Detroit Lions (NFL)
   - Detroit Pistons (NBA)
   - Detroit Red Wings (NHL)
   - Detroit Tigers (MLB)
   - Ohio State Buckeyes Football (NCAA)
   - University of Dayton Flyers Men's Basketball (NCAA)
   Include recent scores where available in "Team A XX - XX Team B" format. Keep each team to 2-3 sentences covering latest results and key storylines.
6. SIGN-OFF (~30 seconds): Brief recap of the top 2-3 headlines and a friendly closing.

STYLE GUIDELINES:
- Write ONLY spoken words — no stage directions, sound cues, brackets, or formatting marks
- Use short paragraphs (2-3 sentences) separated by blank lines for natural speech pacing
- Conversational but knowledgeable tone — like a well-informed friend catching you up
- Smooth transitions between segments
- For the sports ticker, be energetic and concise — think SportsCenter highlights

HERE ARE TODAY'S NEWS STORIES:

${newsText}`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error('Claude API error:', claudeResponse.status, errText);
      return new Response(JSON.stringify({ error: `AI generation failed (${claudeResponse.status}).` }), { status: 500, headers });
    }

    const claudeData: any = await claudeResponse.json();
    const script = claudeData.content?.[0]?.text || 'Failed to generate script.';
    const wordCount = script.split(/\s+/).length;
    const estimatedMinutes = Math.round(wordCount / 150);
    const episodeNumber = getNextEpisodeNumber();
    const title = `Ep. ${episodeNumber} — Bryan's Daily Podcast — ${today}`;
    console.log(`  Script: ${wordCount} words, ~${estimatedMinutes} min`);

    // STEP 3: Generate audio with Edge TTS
    console.log(`Step 3: Generating audio with voice ${voice}...`);
    let audioFilename = '';
    let audioFileSize = 0;
    let audioDuration = 0;
    let audioError = '';

    try {
      fs.mkdirSync(EPISODES_DIR, { recursive: true });
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      const sanitized = script
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

      const { audioFilePath } = await tts.toFile(EPISODES_DIR, sanitized);
      const stats = fs.statSync(audioFilePath);

      // Rename to a unique filename
      const id = Date.now().toString(36);
      audioFilename = `episode-${id}.mp3`;
      const newPath = path.join(EPISODES_DIR, audioFilename);
      fs.renameSync(audioFilePath, newPath);

      audioFileSize = stats.size;
      audioDuration = Math.round(stats.size / 6000); // 48kbps estimate
      console.log(`  Audio saved: ${audioFilename} (${audioFileSize} bytes, ~${audioDuration}s)`);

      // STEP 4: Auto-publish to feed
      console.log('Step 4: Publishing to feed...');
      const episode: Episode = {
        id,
        title,
        description: `${uniqueItems.length} stories · ${selectedLabels.join(', ')} · ~${estimatedMinutes} min`,
        filename: audioFilename,
        fileSize: audioFileSize,
        pubDate: new Date().toUTCString(),
        duration: audioDuration,
        categories: selectedLabels,
      };
      saveEpisode(episode);
      console.log('  Episode published!');

    } catch (ttsErr: any) {
      console.error('TTS/publish error:', ttsErr?.message || ttsErr);
      audioError = ttsErr?.message || 'Audio generation failed';
    }

    // Return everything to the client
    return new Response(JSON.stringify({
      script,
      title,
      categories: selectedLabels,
      generatedAt: new Date().toISOString(),
      storiesCount: uniqueItems.length,
      wordCount,
      estimatedMinutes,
      audioFilename,
      audioError,
      published: audioFilename !== '',
    }), { headers });

  } catch (error: any) {
    console.error('Podcast generation error:', error);
    return new Response(JSON.stringify({ error: `Server error: ${error?.message || 'Unknown error'}` }), { status: 500, headers });
  }
};
