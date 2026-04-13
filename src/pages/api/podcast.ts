import type { APIRoute } from 'astro';

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
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .trim();
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

    // Google News titles often end with " - Source Name", clean that up
    const dashIndex = title.lastIndexOf(' - ');
    if (dashIndex > 20) {
      title = title.substring(0, dashIndex);
    }

    if (title) {
      items.push({ title, description: description.slice(0, 300), source, category });
    }
  }

  return items;
}

async function fetchFeed(url: string, name: string, category: string): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DailyDigestPodcast/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return [];

    const xml = await response.text();
    return parseRSSItems(xml, name, category);
  } catch {
    return [];
  }
}

export const POST: APIRoute = async ({ request }) => {
  const headers = { 'Content-Type': 'application/json' };

  try {
    const body = await request.json();
    const categories: string[] = body.categories;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return new Response(JSON.stringify({ error: 'Please select at least one category.' }), { status: 400, headers });
    }

    // Resolve API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'ANTHROPIC_API_KEY is not configured. Set it as an environment variable on your server.',
      }), { status: 500, headers });
    }

    // Fetch all RSS feeds for selected categories in parallel
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

    // Deduplicate by title
    const seen = new Set<string>();
    const uniqueItems = allItems.filter(item => {
      const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (uniqueItems.length === 0) {
      return new Response(JSON.stringify({
        error: 'Could not fetch news from any source. Please try again in a moment.',
      }), { status: 500, headers });
    }

    // Group items by category for the prompt
    const grouped: Record<string, NewsItem[]> = {};
    for (const item of uniqueItems) {
      if (!grouped[item.category]) grouped[item.category] = [];
      if (grouped[item.category].length < 10) {
        grouped[item.category].push(item);
      }
    }

    const newsText = Object.entries(grouped)
      .map(([category, items]) => {
        const itemList = items
          .map((item, i) => `  ${i + 1}. [${item.source}] ${item.title}\n     ${item.description || 'No description.'}`)
          .join('\n');
        return `=== ${category.toUpperCase()} ===\n${itemList}`;
      })
      .join('\n\n');

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const prompt = `You are the host of "Bryan's Daily Podcast," a personalized 10-minute news briefing podcast. Generate a podcast script of approximately 1,500 words based on the news stories below.

Today's date: ${today}

STRUCTURE & TIMING:
1. OPENING (~30 seconds): Warm greeting, date, and quick preview of what's coming up.
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
- Smooth transitions between segments (e.g., "Shifting gears to the sports world..." or "Now let's check in on what Apple's been up to...")
- If a story doesn't have enough detail, briefly mention it and move on
- For the sports ticker, be energetic and concise — think SportsCenter highlights

HERE ARE TODAY'S NEWS STORIES:

${newsText}`;

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error('Claude API error:', claudeResponse.status, errText);
      return new Response(JSON.stringify({
        error: `AI generation failed (${claudeResponse.status}). Please check your ANTHROPIC_API_KEY.`,
      }), { status: 500, headers });
    }

    const claudeData: any = await claudeResponse.json();
    const script = claudeData.content?.[0]?.text || 'Failed to generate podcast script.';

    // Estimate word count and duration
    const wordCount = script.split(/\s+/).length;
    const estimatedMinutes = Math.round(wordCount / 150);

    return new Response(JSON.stringify({
      script,
      title: `Bryan's Daily Podcast — ${today}`,
      categories: selectedLabels,
      generatedAt: new Date().toISOString(),
      storiesCount: uniqueItems.length,
      wordCount,
      estimatedMinutes,
    }), { headers });

  } catch (error: any) {
    console.error('Podcast generation error:', error);
    return new Response(JSON.stringify({
      error: `Server error: ${error?.message || 'Unknown error'}`,
    }), { status: 500, headers });
  }
};
