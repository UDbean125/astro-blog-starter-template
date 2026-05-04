/**
 * Bryan's Daily Podcast — Cron Trigger Worker
 *
 * This lightweight Worker fires on Cloudflare Cron Triggers (server-side, no Mac needed)
 * and calls the main podcast Worker's /api/cron endpoint to generate daily episodes.
 *
 * Schedule: Daily at 11:00 UTC (7:00 AM ET) and 13:00 UTC (9:00 AM ET backup)
 *
 * Why a separate Worker?
 * The main podcast Worker uses Astro + Cloudflare adapter which doesn't natively
 * support the scheduled() event handler. This tiny Worker acts as the cron trigger
 * that calls the main Worker's HTTP endpoint — guaranteeing 7-day/week reliability
 * regardless of whether Bryan's Mac is awake.
 */

export interface Env {
	PODCAST_WORKER_URL: string;
	CRON_SECRET?: string;
}

export default {
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		const baseUrl = env.PODCAST_WORKER_URL || 'https://podcast.hhsolutions.cloud';
		const secret = env.CRON_SECRET || '';

		const url = secret
			? `${baseUrl}/api/cron?key=${secret}`
			: `${baseUrl}/api/cron`;

		console.log(`[CRON] Firing at ${new Date().toISOString()} — calling ${baseUrl}/api/cron`);

		try {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout

			const response = await fetch(url, {
				method: 'GET',
				signal: controller.signal,
				headers: {
					'User-Agent': 'BryansDailyCronWorker/1.0',
				},
			});
			clearTimeout(timeout);

			const body = await response.text();
			console.log(`[CRON] Response: HTTP ${response.status} — ${body.slice(0, 500)}`);

			if (!response.ok) {
				console.error(`[CRON] Non-200 response: ${response.status}`);
			}
		} catch (err: any) {
			if (err?.name === 'AbortError') {
				console.log('[CRON] Request timed out after 25s — generation likely running in background via waitUntil');
			} else {
				console.error(`[CRON] Error: ${err?.message || 'Unknown'}`);
			}
		}
	},

	// Also allow manual GET trigger for testing
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === '/trigger') {
			// Manually fire the scheduled event logic
			const baseUrl = env.PODCAST_WORKER_URL || 'https://podcast.hhsolutions.cloud';
			const secret = env.CRON_SECRET || '';
			const cronUrl = secret
				? `${baseUrl}/api/cron?key=${secret}`
				: `${baseUrl}/api/cron`;

			try {
				const response = await fetch(cronUrl, {
					headers: { 'User-Agent': 'BryansDailyCronWorker/1.0-manual' },
				});
				const body = await response.text();
				return new Response(JSON.stringify({
					ok: response.ok,
					status: response.status,
					body: body.slice(0, 1000),
					triggeredAt: new Date().toISOString(),
				}), {
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (err: any) {
				return new Response(JSON.stringify({
					ok: false,
					error: err?.message || 'Unknown error',
					triggeredAt: new Date().toISOString(),
				}), {
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}

		return new Response(JSON.stringify({
			service: 'bryans-daily-cron',
			description: 'Cloudflare Cron Trigger for Bryan\'s Daily Podcast',
			schedule: '11:00 UTC (7 AM ET) + 13:00 UTC (9 AM ET backup)',
			manual_trigger: '/trigger',
		}), {
			headers: { 'Content-Type': 'application/json' },
		});
	},
};
