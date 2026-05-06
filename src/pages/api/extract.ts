import type { APIRoute } from "astro";
import { extract } from "../../lib/readability";

export const prerender = false;

/**
 * POST /api/extract { url: string }
 * Fetches the page server-side (bypassing CORS) and returns the readable article.
 */
export const POST: APIRoute = async ({ request }) => {
	let url: string;
	try {
		const body = await request.json() as { url?: string };
		if (!body.url) throw new Error("url required");
		url = body.url;
	} catch {
		return json({ error: "Invalid body; expected { url }" }, 400);
	}

	try {
		const u = new URL(url);
		if (!/^https?:$/.test(u.protocol)) throw new Error("unsupported protocol");
	} catch {
		return json({ error: "Invalid URL" }, 400);
	}

	try {
		const res = await fetch(url, {
			redirect: "follow",
			headers: {
				"User-Agent": "HarbourBot/1.0 (+https://harbour.app) Mozilla/5.0 (compatible)",
				Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.9",
			},
		});
		if (!res.ok) return json({ error: `Fetch failed (${res.status})` }, 502);

		const contentType = res.headers.get("content-type") || "";
		if (!/html|xml|text/.test(contentType)) {
			return json({ error: `Unsupported content type: ${contentType}` }, 415);
		}

		const html = await res.text();
		const article = extract(html, res.url || url);
		return json({ ok: true, article });
	} catch (err: any) {
		return json({ error: err?.message || "Unknown error" }, 500);
	}
};

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
			"cache-control": "no-store",
			"access-control-allow-origin": "*",
		},
	});
}

export const OPTIONS: APIRoute = () =>
	new Response(null, {
		status: 204,
		headers: {
			"access-control-allow-origin": "*",
			"access-control-allow-methods": "POST, OPTIONS",
			"access-control-allow-headers": "content-type",
		},
	});
