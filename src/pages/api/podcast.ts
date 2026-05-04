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

const RSS_FEEDS: Record<string, { label: string; feeds: FeedConfig[] }> = {
  ai: {
    label: 'AI & Claude Code',
    feeds: [
      { name: 'AI - Claude/Anthropic', url: 'https://news.google.com/rss/search?q=Claude+Code+OR+Anthropic+Claude+OR+Claude+AI+agent+OR+Claude+Cowork&hl=en-US&gl=US&ceid=US:en' },
      { name: 'AI - General', url: 'https://news.google.com/rss/search?q=artificial+intelligence+capabilities+OR+AI+coding+assistant+OR+OpenAI+OR+Google+Gemini&hl=en-US&gl=US&ceid=US:en' },
      { name: 'AI - Industry', url: 'https://news.google.com/rss/search?q=AI+enterprise+adoption+OR+generative+AI+business+OR+AI+agent+framework&hl=en-US&gl=US&ceid=US:en' },
    ],
  },
  apple: {
    label: 'Apple',
    feeds: [
      { name: 'Apple', url: 'https://news.google.com/rss/search?q=Apple+iPhone+OR+Apple+macOS+OR+Apple+iOS+OR+Apple+WWDC+OR+Apple+Vision+Pro&hl=en-US&gl=US&ceid=US:en' },
      { name: '9to5Mac', url: 'https://9to5mac.com/feed/' },
      { name: 'MacRumors', url: 'https://feeds.macrumors.com/MacRumors-All' },
    ],
  },
  autodesk: {
    label: 'Graitec & Autodesk',
    feeds: [
      { name: 'Autodesk/Graitec', url: 'https://news.google.com/rss/search?q=Autodesk+OR+Graitec+OR+Revit+OR+BIM+software&hl=en-US&gl=US&ceid=US:en' },
      { name: 'AEC Tech', url: 'https://news.google.com/rss/search?q=construction+technology+OR+digital+twin+building+OR+AEC+software&hl=en-US&gl=US&ceid=US:en' },
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
      { name: 'Ohio State Buckeyes', url: 'https://news.google.com/rss/search?q=Ohio+State+Buckeyes+football+OR+Ohio+State+athletics&hl=en-US&gl=US&ceid=US:en' },
      { name: 'Dayton Flyers', url: 'https://news.google.com/rss/search?q=Dayton+Flyers+basketball+OR+Dayton+Flyers+NCAA&hl=en-US&gl=US&ceid=US:en' },
    ],
  },
};

const VOICES: Record<string, string> = {
  'elevenlabs-bryan': 'Bryan (My Voice)',
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

const ELEVENLABS_VOICE_ID = 'T8Kic09vy1V4X00KPL5g';

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

// --- KV-backed episode storage ---

async function readEpisodes(kv: any): Promise<Episode[]> {
  try {
    const data = await kv.get('episodes', { type: 'json' });
    return data || [];
  } catch { return []; }
}

// Previous episodes (1-40) used ephemeral filesystem storage and their audio was lost.
// We continue numbering from 41 onward with persistent KV storage.
const EPISODE_NUMBER_OFFSET = 40;

async function getNextEpisodeNumber(kv: any): Promise<number> {
  const episodes = await readEpisodes(kv);
  if (episodes.length === 0) return EPISODE_NUMBER_OFFSET + 1;
  let maxNum = 0;
  for (const ep of episodes) {
    const match = ep.title.match(/Ep\.\s*(\d+)/);
    if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
  }
  return maxNum > 0 ? maxNum + 1 : EPISODE_NUMBER_OFFSET + episodes.length + 1;
}

async function hasTodaysEpisode(kv: any): Promise<boolean> {
  const episodes = await readEpisodes(kv);
  const today = new Date().toISOString().slice(0, 10);
  return episodes.some(ep => ep.pubDate && new Date(ep.pubDate).toISOString().slice(0, 10) === today);
}

async function saveEpisode(kv: any, episode: Episode) {
  const episodes = await readEpisodes(kv);
  episodes.unshift(episode);
  await kv.put('episodes', JSON.stringify(episodes));
}

async function saveAudio(kv: any, filename: string, data: ArrayBuffer) {
  await kv.put(`audio:${filename}`, data);
}

// --- GET: return available voices ---
export const GET: APIRoute = async () => {
  const voiceList = Object.entries(VOICES).map(([id, name]) => ({ id, name }));
  return new Response(JSON.stringify(voiceList), {
    headers: { 'Content-Type': 'application/json' },
  });
};

// --- Job status helpers (KV-backed) ---

interface JobStatus {
  status: 'pending' | 'fetching_news' | 'generating_script' | 'generating_show_notes' | 'generating_audio' | 'publishing' | 'complete' | 'error';
  step?: string;
  progress?: string;
  result?: any;
  error?: string;
  startedAt: string;
  updatedAt: string;
}

async function setJobStatus(kv: any, jobId: string, update: Partial<JobStatus>) {
  const existing = await kv.get(`job:${jobId}`, { type: 'json' }) as JobStatus | null;
  const status: JobStatus = {
    ...existing,
    ...update,
    updatedAt: new Date().toISOString(),
  } as JobStatus;
  // Jobs expire after 1 hour
  await kv.put(`job:${jobId}`, JSON.stringify(status), { expirationTtl: 3600 });

  // Persist errors and completions to a non-expiring log for debugging.
  // This lets us diagnose why episodes are missing days after the fact.
  if (update.status === 'error' || update.status === 'complete') {
    try {
      const logs: any[] = (await kv.get('generation_log', { type: 'json' })) || [];
      logs.unshift({
        jobId,
        status: update.status,
        error: update.error || null,
        timestamp: new Date().toISOString(),
        result: update.status === 'complete' ? { title: update.result?.title, storiesCount: update.result?.storiesCount } : null,
      });
      // Keep last 30 entries
      await kv.put('generation_log', JSON.stringify(logs.slice(0, 30)));
    } catch { /* non-critical */ }
  }
}

async function getJobStatus(kv: any, jobId: string): Promise<JobStatus | null> {
  return kv.get(`job:${jobId}`, { type: 'json' });
}

// --- POST: start async generation job ---
export const POST: APIRoute = async ({ request, locals }) => {
  const headers = { 'Content-Type': 'application/json' };

  const runtime = (locals as any).runtime;
  const kv = runtime?.env?.EPISODES_KV;

  if (!kv) {
    return new Response(JSON.stringify({ error: 'EPISODES_KV binding not available.' }), { status: 500, headers });
  }

  try {
    const body = await request.json();
    const categories: string[] = body.categories || [];
    const voice: string = body.voice || 'elevenlabs-bryan';
    const force: boolean = body.force || false;

    if (!force && await hasTodaysEpisode(kv)) {
      return new Response(JSON.stringify({ message: 'Episode already exists for today. Pass "force": true to override.' }), { status: 200, headers });
    }

    if (categories.length === 0) {
      return new Response(JSON.stringify({ error: 'Please select at least one category.' }), { status: 400, headers });
    }

    const apiKey = runtime?.env?.ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured.' }), { status: 500, headers });
    }

    const elevenLabsKey = runtime?.env?.ELEVENLABS_API_KEY || import.meta.env.ELEVENLABS_API_KEY || '';

    // Generate a unique job ID and return it immediately
    const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await setJobStatus(kv, jobId, {
      status: 'pending',
      step: 'Starting podcast generation...',
      startedAt: new Date().toISOString(),
    });

    // Run the heavy pipeline in the background via waitUntil
    const ctx = runtime?.ctx;
    const generatePromise = generatePodcastAsync(kv, jobId, categories, voice, apiKey, elevenLabsKey);

    if (ctx?.waitUntil) {
      ctx.waitUntil(generatePromise);
    } else {
      // Fallback: run inline (will still work but may timeout on very slow connections)
      generatePromise.catch((err: any) => console.error('Background generation error:', err));
    }

    return new Response(JSON.stringify({ jobId }), { headers });

  } catch (error: any) {
    console.error('Podcast start error:', error);
    return new Response(JSON.stringify({ error: `Server error: ${error?.message || 'Unknown error'}` }), { status: 500, headers });
  }
};

// --- Background generation pipeline ---
async function generatePodcastAsync(
  kv: any,
  jobId: string,
  categories: string[],
  voice: string,
  apiKey: string,
  elevenLabsKey: string,
) {
  try {
    // STEP 1: Fetch news
    await setJobStatus(kv, jobId, { status: 'fetching_news', step: 'Fetching latest news from RSS feeds...' });

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
      await setJobStatus(kv, jobId, { status: 'error', error: 'Could not fetch news. Try again.' });
      return;
    }

    await setJobStatus(kv, jobId, {
      status: 'fetching_news',
      step: `Found ${uniqueItems.length} stories`,
      progress: `${uniqueItems.length} stories across ${selectedLabels.join(', ')}`,
    });

    // STEP 2: Generate script with Claude
    await setJobStatus(kv, jobId, { status: 'generating_script', step: 'Writing your podcast script with AI...' });

    const episodeNumber = await getNextEpisodeNumber(kv);
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

    const prompt = `You are Bryan Hennigan, host of "Bryan's Daily Podcast" — a sharp, 10-minute daily news briefing that blends tech, sports, and industry insights. You're a senior account manager in AEC/construction software who's deeply passionate about AI, Apple, and Detroit sports. Your audience is professionals who want to start their day informed without sifting through dozens of feeds.

Generate a podcast script of approximately 1,500 words.

Today's date: ${today}
Episode number: ${episodeNumber}

STRUCTURE & TIMING:
1. COLD OPEN (~15 seconds): Start with the single most compelling headline of the day as a hook. "Here's what you need to know today..." Then transition to the greeting.
2. GREETING (~15 seconds): "Welcome to episode ${episodeNumber} of Bryan's Daily Podcast, your daily news briefing. I'm Bryan Hennigan, and today is ${today}." Quick 2-3 word preview of each segment.
3. AI & TECHNOLOGY (~4 minutes): Lead with the biggest AI stories. Prioritize practical implications — what does this mean for people building with AI, working in tech, or running businesses? Cover Claude, Anthropic, OpenAI, and emerging tools. Add your take on what matters and what's noise.
4. APPLE (~2 minutes): Apple product updates, OS releases, hardware, and ecosystem news. Focus on what's actionable for users.
5. GRAITEC & AUTODESK (~1 minute): AEC industry tech — Revit, BIM, construction software, digital transformation in the built environment. Connect to broader industry trends.
6. SPORTS ROUNDUP (~2.5 minutes): Energetic, opinionated sports coverage:
   - Detroit Lions (NFL) — lead with them
   - Detroit Tigers (MLB)
   - Detroit Pistons (NBA)
   - Detroit Red Wings (NHL)
   - Ohio State Buckeyes Football (NCAA)
   - Dayton Flyers Men's Basketball (NCAA)
   Include scores in "Team XX, Opponent XX" format when available. Give each team 2-3 punchy sentences. Show genuine fandom — this isn't ESPN neutral, you're a Detroit guy.
7. SIGN-OFF (~30 seconds): "That's your briefing for ${today}." Tease tomorrow's potential stories if possible. "I'm Bryan Hennigan — have a great day, and I'll see you tomorrow."

VOICE & STYLE:
- Write ONLY spoken words. Zero stage directions, sound cues, brackets, or formatting marks.
- No markdown whatsoever — no #, *, ---, bold, headers, or bullet characters.
- Plain text paragraphs only, separated by blank lines.
- Short paragraphs (2-3 sentences) for natural speech pacing.
- Conversational, confident, and knowledgeable — you're the well-informed friend who reads everything so they don't have to.
- Use natural transitions between segments ("Shifting gears to Apple...", "Now let's talk sports...").
- Vary sentence length. Mix quick punchy lines with longer analytical ones.
- Occasionally share a brief personal take or opinion — this is what separates you from generic news bots.
- For sports, be energetic and show emotion. You care about these teams.

NEWS STORIES TO COVER:

${newsText}`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error('Claude API error:', claudeResponse.status, errText);
      await setJobStatus(kv, jobId, { status: 'error', error: `AI generation failed (${claudeResponse.status}).` });
      return;
    }

    const claudeData: any = await claudeResponse.json();
    const script = claudeData.content?.[0]?.text || 'Failed to generate script.';
    const wordCount = script.split(/\s+/).length;
    const estimatedMinutes = Math.round(wordCount / 150);
    const title = `Ep. ${episodeNumber} — Bryan's Daily Podcast — ${today}`;

    // STEP 2b: Generate show notes
    await setJobStatus(kv, jobId, { status: 'generating_show_notes', step: 'Creating show notes...' });

    let showNotes = '';
    try {
      const summaryPrompt = `Given the following podcast script, generate concise show notes for a podcast episode listing. Format as plain text (no markdown).

Start with a 1-2 sentence episode overview, then list the key topics and takeaways.

Format:
[1-2 sentence overview of the episode]

Topics covered:
- [Topic 1]: [Key takeaway in 1 sentence]
- [Topic 2]: [Key takeaway in 1 sentence]
...

Keep it to 6-10 bullet points max. Be specific about what was discussed, not generic.

SCRIPT:
${script.slice(0, 6000)}`;

      const summaryResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 1024, messages: [{ role: 'user', content: summaryPrompt }] }),
      });

      if (summaryResponse.ok) {
        const summaryData: any = await summaryResponse.json();
        showNotes = summaryData.content?.[0]?.text || '';
      }
    } catch (e: any) {
      console.warn('Show notes error:', e?.message);
    }

    if (!showNotes) {
      showNotes = `Episode ${episodeNumber} of Bryan's Daily Podcast covering ${selectedLabels.join(', ')}. ${uniqueItems.length} stories in ~${estimatedMinutes} minutes.`;
    }

    // STEP 3: Generate audio
    await setJobStatus(kv, jobId, { status: 'generating_audio', step: 'Converting script to audio with your voice...' });

    let audioFilename = '';
    let audioFileSize = 0;
    let audioDuration = 0;
    let audioError = '';

    const cleanScript = script
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
      .replace(/^[-*_]{3,}\s*$/gm, '')
      .replace(/^[-*]\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*_~`>]/g, '');

    try {
      if (voice === 'elevenlabs-bryan') {
        if (!elevenLabsKey) {
          throw new Error('ELEVENLABS_API_KEY not configured.');
        }
        const paragraphs = cleanScript.split('\n\n').filter((p: string) => p.trim());
        const chunks: string[] = [];
        let current = '';
        for (const para of paragraphs) {
          if ((current + '\n\n' + para).length > 2500 && current) {
            chunks.push(current.trim());
            current = para;
          } else {
            current = current ? current + '\n\n' + para : para;
          }
        }
        if (current.trim()) chunks.push(current.trim());

        const audioChunks: ArrayBuffer[] = [];

        for (let i = 0; i < chunks.length; i++) {
          await setJobStatus(kv, jobId, {
            status: 'generating_audio',
            step: `Generating audio chunk ${i + 1} of ${chunks.length}...`,
            progress: `${Math.round(((i) / chunks.length) * 100)}%`,
          });

          // Retry each chunk up to 3 times with exponential backoff.
          // ElevenLabs occasionally returns 429 (rate limit) or 500 (server error).
          let chunkAudio: ArrayBuffer | null = null;
          let lastChunkErr = '';
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              if (attempt > 0) {
                // Wait 2s, 5s before retries
                await new Promise(r => setTimeout(r, attempt === 1 ? 2000 : 5000));
              }
              const elResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
                method: 'POST',
                headers: {
                  'xi-api-key': elevenLabsKey,
                  'Content-Type': 'application/json',
                  'Accept': 'audio/mpeg',
                },
                body: JSON.stringify({
                  text: chunks[i],
                  model_id: 'eleven_multilingual_v2',
                  voice_settings: { stability: 0.5, similarity_boost: 0.75 },
                }),
              });

              if (!elResponse.ok) {
                const errText = await elResponse.text();
                lastChunkErr = `ElevenLabs ${elResponse.status} on chunk ${i + 1}/${chunks.length} (attempt ${attempt + 1}): ${errText.slice(0, 200)}`;
                console.error(lastChunkErr);
                // 401/403 = bad API key, don't retry
                if (elResponse.status === 401 || elResponse.status === 403) break;
                continue;
              }

              chunkAudio = await elResponse.arrayBuffer();
              break; // Success
            } catch (fetchErr: any) {
              lastChunkErr = `ElevenLabs fetch error on chunk ${i + 1} (attempt ${attempt + 1}): ${fetchErr?.message || 'unknown'}`;
              console.error(lastChunkErr);
            }
          }

          if (!chunkAudio) {
            throw new Error(lastChunkErr || `ElevenLabs failed on chunk ${i + 1} after 3 attempts`);
          }

          audioChunks.push(chunkAudio);
        }

        const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of audioChunks) {
          combined.set(new Uint8Array(chunk), offset);
          offset += chunk.byteLength;
        }

        const id = Date.now().toString(36);
        audioFilename = `episode-${id}.mp3`;

        await saveAudio(kv, audioFilename, combined.buffer);

        audioFileSize = totalLength;
        const bytesPerSecond = 16000;
        audioDuration = Math.round(totalLength / bytesPerSecond);
        const wordBasedDuration = wordCount / 150 * 60;
        if (audioDuration > 2700 || audioDuration < 30) {
          audioDuration = Math.round(wordBasedDuration);
        }
      } else {
        throw new Error('Edge TTS is not available in Cloudflare Workers. Use "elevenlabs-bryan" voice.');
      }

      // STEP 4: Publish
      await setJobStatus(kv, jobId, { status: 'publishing', step: 'Publishing episode to feed...' });

      const id = audioFilename.replace('episode-', '').replace('.mp3', '');
      const episode: Episode = {
        id,
        title,
        description: `${uniqueItems.length} stories · ${selectedLabels.join(', ')} · ~${estimatedMinutes} min`,
        showNotes,
        script,
        filename: audioFilename,
        fileSize: audioFileSize,
        pubDate: new Date().toUTCString(),
        duration: audioDuration,
        categories: selectedLabels,
      };
      await saveEpisode(kv, episode);

    } catch (ttsErr: any) {
      console.error('TTS/publish error:', ttsErr?.message || ttsErr);
      audioError = ttsErr?.message || 'Audio generation failed';
    }

    // Mark job complete with full result
    await setJobStatus(kv, jobId, {
      status: audioError ? 'error' : 'complete',
      step: audioError ? 'Audio generation failed' : 'Episode published!',
      error: audioError || undefined,
      result: {
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
      },
    });

  } catch (error: any) {
    console.error('Background generation error:', error);
    await setJobStatus(kv, jobId, {
      status: 'error',
      error: `Server error: ${error?.message || 'Unknown error'}`,
    });
  }
}
