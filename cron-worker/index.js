/**
 * Standalone Cloudflare Worker that triggers Bryan's Daily Podcast generation.
 *
 * This exists because the main Astro-based Worker doesn't natively support
 * Cloudflare's scheduled() handler. This Worker runs on a cron schedule
 * and hits the podcast API endpoint via HTTP.
 *
 * UPDATED 2026-05-02: The /api/cron endpoint now returns immediately with a jobId.
 * No need for retry logic around timeouts — the heavy work runs in background via waitUntil.
 *
 * Deploy:  cd cron-worker && npx wrangler deploy
 */

const API_BASE = "https://podcast.hhsolutions.cloud";
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [5000, 15000, 30000]; // 5s, 15s, 30s

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Single attempt to trigger generation.
 * Now expects a fast response (< 5s) since the cron endpoint no longer polls.
 */
async function triggerGeneration() {
  const url = `${API_BASE}/api/cron`;
  console.log(`[CRON] Calling: ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "podcast-cron-trigger/2.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const contentType = res.headers.get("content-type") || "";

    // Detect the HTML-instead-of-JSON failure mode
    if (contentType.includes("text/html")) {
      const body = await res.text();
      const isAstroPage =
        body.length > 10000 ||
        body.includes("<!DOCTYPE") ||
        body.includes("<html");
      if (isAstroPage) {
        throw new Error(
          `API route returned HTML (${body.length} bytes) instead of JSON. ` +
            `The Astro SSR Worker likely needs redeployment. ` +
            `Run: cd "Hennigan's Huddle" && pnpm build && npx wrangler deploy`
        );
      }
    }

    if (!contentType.includes("application/json")) {
      const body = await res.text();
      throw new Error(
        `Unexpected content-type "${contentType}". Status: ${res.status}. Body: ${body.slice(0, 200)}`
      );
    }

    const data = await res.json();

    if (!res.ok || data.ok === false) {
      throw new Error(`API returned ${res.status}: ${JSON.stringify(data)}`);
    }

    return data;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error("Request timed out after 30s. The worker may be overloaded.");
    }
    throw err;
  }
}

/**
 * Retry wrapper — attempts generation up to MAX_RETRIES times.
 */
async function triggerWithRetry() {
  console.log(
    `[CRON] Starting daily podcast trigger at ${new Date().toISOString()}`
  );

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await triggerGeneration();
      console.log(
        `[CRON] Success on attempt ${attempt}: ${JSON.stringify(result)}`
      );
      return result;
    } catch (err) {
      console.error(
        `[CRON] Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`
      );

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS_MS[attempt - 1] || 30000;
        console.log(`[CRON] Retrying in ${delay / 1000}s...`);
        await sleep(delay);
      } else {
        throw err;
      }
    }
  }
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        try {
          const result = await triggerWithRetry();
          console.log(
            `[CRON] Trigger complete: ${result.message || "OK"}`
          );
        } catch (err) {
          console.error(`[CRON] ALL ${MAX_RETRIES} ATTEMPTS FAILED: ${err.message}`);
          console.error(
            `[CRON] Fix: cd "Hennigan's Huddle" && pnpm build && npx wrangler deploy`
          );
        }
      })()
    );
  },

  // Manual trigger via HTTP GET for testing
  async fetch(request) {
    try {
      const result = await triggerWithRetry();
      return new Response(JSON.stringify(result, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(
        JSON.stringify(
          {
            error: err.message,
            attempts: MAX_RETRIES,
            fix: 'cd "Hennigan\'s Huddle" && pnpm build && npx wrangler deploy',
            timestamp: new Date().toISOString(),
          },
          null,
          2
        ),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};
