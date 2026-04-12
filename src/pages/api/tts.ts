import type { APIRoute } from 'astro';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const VOICES: Record<string, { name: string; locale: string }> = {
  'en-US-AndrewNeural': { name: 'Andrew (Male, US)', locale: 'en-US' },
  'en-US-BrianNeural': { name: 'Brian (Male, US)', locale: 'en-US' },
  'en-US-ChristopherNeural': { name: 'Christopher (Male, US)', locale: 'en-US' },
  'en-US-GuyNeural': { name: 'Guy (Male, US)', locale: 'en-US' },
  'en-US-AriaNeural': { name: 'Aria (Female, US)', locale: 'en-US' },
  'en-US-JennyNeural': { name: 'Jenny (Female, US)', locale: 'en-US' },
  'en-US-AvaNeural': { name: 'Ava (Female, US)', locale: 'en-US' },
  'en-US-EmmaNeural': { name: 'Emma (Female, US)', locale: 'en-US' },
  'en-GB-RyanNeural': { name: 'Ryan (Male, UK)', locale: 'en-GB' },
  'en-GB-SoniaNeural': { name: 'Sonia (Female, UK)', locale: 'en-GB' },
  'en-AU-WilliamNeural': { name: 'William (Male, AU)', locale: 'en-AU' },
  'en-AU-NatashaNeural': { name: 'Natasha (Female, AU)', locale: 'en-AU' },
};

export const GET: APIRoute = async () => {
  const voiceList = Object.entries(VOICES).map(([id, info]) => ({ id, ...info }));
  return new Response(JSON.stringify(voiceList), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { text, voice = 'en-US-AndrewNeural', rate = '1.0' } = await request.json();

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'No text provided.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!VOICES[voice]) {
      return new Response(JSON.stringify({ error: 'Invalid voice.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    // Sanitize text for XML (SSML)
    const sanitized = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const { audioStream } = tts.toStream(sanitized, { rate: rate.toString() });

    // Collect all audio chunks into a buffer
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      audioStream.on('end', resolve);
      audioStream.on('close', resolve);
      audioStream.on('error', reject);
    });

    const audioBuffer = Buffer.concat(chunks);

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('TTS error:', error);
    return new Response(JSON.stringify({ error: `TTS failed: ${error?.message || 'Unknown error'}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
