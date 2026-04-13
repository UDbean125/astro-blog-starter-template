import type { APIRoute } from 'astro';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { voice = 'en-US-AndrewNeural' } = await request.json();

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const sampleText = "Hey, welcome to Bryan's Daily Podcast. Here's a quick preview of what this voice sounds like for your daily news briefing.";

    const { audioStream } = tts.toStream(sampleText);
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      audioStream.on('end', resolve);
      audioStream.on('close', resolve);
      audioStream.on('error', reject);
    });

    return new Response(Buffer.concat(chunks), {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  } catch (error: any) {
    console.error('Voice preview error:', error?.message);
    return new Response(JSON.stringify({ error: 'Preview failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
