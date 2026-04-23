import type { APIRoute } from 'astro';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const ELEVENLABS_VOICE_ID = 'T8Kic09vy1V4X00KPL5g';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '72d930801534f514bc37f363ac2f95c3719438b6c5c49c1354af42e2306ff087';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { voice = 'en-US-AndrewNeural' } = await request.json();
    const sampleText = "Hey, welcome to Bryan's Daily Podcast. Here's a quick preview of what this voice sounds like for your daily news briefing.";

    if (voice === 'elevenlabs-bryan') {
      const elResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: sampleText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      });

      if (!elResponse.ok) throw new Error(`ElevenLabs error: ${elResponse.status}`);
      const audioBuffer = Buffer.from(await elResponse.arrayBuffer());
      return new Response(audioBuffer, { headers: { 'Content-Type': 'audio/mpeg' } });
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(sampleText);
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      audioStream.on('end', resolve);
      audioStream.on('close', resolve);
      audioStream.on('error', reject);
    });

    return new Response(Buffer.concat(chunks), { headers: { 'Content-Type': 'audio/mpeg' } });
  } catch (error: any) {
    console.error('Voice preview error:', error?.message);
    return new Response(JSON.stringify({ error: 'Preview failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
