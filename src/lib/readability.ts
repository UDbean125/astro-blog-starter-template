/**
 * Readability-lite: extract main article content from HTML.
 * Runs in a worker (Cloudflare) — so no DOM. We use a small regex-based
 * parser focused on common article patterns; not as good as Mozilla Readability
 * but small, dependency-free, and good enough for most blog/news sites.
 */

const BLOCK_TAGS = /<(script|style|noscript|iframe|svg|form|nav|aside|footer|header)[^>]*>[\s\S]*?<\/\1>/gi;
const COMMENTS = /<!--[\s\S]*?-->/g;
const SELF_CLOSING_JUNK = /<(input|meta|link|source|track|br|hr)\b[^>]*>/gi;

export interface ExtractedArticle {
	title: string;
	description?: string;
	siteName?: string;
	author?: string;
	coverImage?: string;
	favicon?: string;
	publishedAt?: number;
	content: string; // cleaned HTML
	text: string;    // plain text
	wordCount: number;
}

function decode(s: string): string {
	return s
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#x27;/g, "'")
		.replace(/&nbsp;/g, " ")
		.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
		.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function meta(html: string, names: string[]): string | undefined {
	for (const name of names) {
		// property
		const p = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i").exec(html);
		if (p?.[1]) return decode(p[1]);
		const r = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name|itemprop)=["']${name}["']`, "i").exec(html);
		if (r?.[1]) return decode(r[1]);
	}
	return undefined;
}

function pickTitle(html: string): string {
	const og = meta(html, ["og:title", "twitter:title"]);
	if (og) return og;
	const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
	if (t?.[1]) return decode(t[1]).replace(/\s+/g, " ").trim();
	return "Untitled";
}

function absolute(url: string | undefined, base: string): string | undefined {
	if (!url) return undefined;
	try { return new URL(url, base).toString(); } catch { return undefined; }
}

/** Crude article-body heuristic: pick the <article> or the div with the most paragraph text. */
function pickBody(html: string): string {
	// First try <article>…</article>
	const a = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html);
	if (a?.[1] && a[1].length > 400) return a[1];

	// Find candidate containers
	const candidates = html.match(/<(div|section|main)[^>]*>[\s\S]*?<\/\1>/gi) || [];
	let best = "";
	let bestScore = 0;
	for (const c of candidates) {
		// Heuristic score: number of <p> tags + text length inside
		const p = (c.match(/<p[\s>]/gi) || []).length;
		const txt = stripTags(c).length;
		if (p < 2 || txt < 400) continue;
		const score = p * 40 + txt;
		if (score > bestScore) {
			bestScore = score;
			best = c;
		}
	}
	return best || html;
}

function stripTags(s: string): string {
	return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function cleanContent(html: string, base: string): string {
	let out = html
		.replace(COMMENTS, "")
		.replace(BLOCK_TAGS, "")
		.replace(SELF_CLOSING_JUNK, "");

	// Drop obvious junk sections
	out = out.replace(/<div[^>]+class=["'][^"']*(share|social|comments|related|sidebar|promo|newsletter|subscribe|advert|ads?|toolbar)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "");

	// Keep only whitelisted tags
	const ALLOWED = new Set(["a","p","br","hr","strong","em","b","i","u","code","pre","blockquote","figure","figcaption","img","h1","h2","h3","h4","h5","h6","ul","ol","li","table","thead","tbody","tr","th","td","sup","sub","mark","span","div"]);
	out = out.replace(/<\/?([a-z][a-z0-9]*)([^>]*)>/gi, (m, tag: string, attrs: string) => {
		const t = tag.toLowerCase();
		if (!ALLOWED.has(t)) return "";
		if (m.startsWith("</")) return `</${t}>`;
		// keep only safe attrs
		let href = "";
		let src = "";
		let alt = "";
		const h = /href=["']([^"']+)["']/i.exec(attrs);
		if (h) href = absolute(h[1], base) || h[1];
		const s = /src=["']([^"']+)["']/i.exec(attrs);
		if (s) src = absolute(s[1], base) || s[1];
		const a = /alt=["']([^"']*)["']/i.exec(attrs);
		if (a) alt = a[1];
		const parts: string[] = [];
		if (href) parts.push(`href="${href}" target="_blank" rel="noopener noreferrer"`);
		if (src) parts.push(`src="${src}" loading="lazy"`);
		if (alt) parts.push(`alt="${alt.replace(/"/g, "&quot;")}"`);
		return parts.length ? `<${t} ${parts.join(" ")}>` : `<${t}>`;
	});

	// Collapse empties
	out = out.replace(/<(\w+)[^>]*>\s*<\/\1>/g, "");

	return out.trim();
}

export function extract(html: string, baseUrl: string): ExtractedArticle {
	const title = pickTitle(html);
	const description = meta(html, ["og:description", "twitter:description", "description"]);
	const siteName = meta(html, ["og:site_name", "application-name"]);
	const author = meta(html, ["author", "article:author", "twitter:creator"]);
	const coverImage = absolute(meta(html, ["og:image", "twitter:image", "twitter:image:src"]), baseUrl);
	const publishedAtRaw = meta(html, ["article:published_time", "og:pubdate", "pubdate", "date"]);
	const publishedAt = publishedAtRaw ? Date.parse(publishedAtRaw) || undefined : undefined;

	const faviconMatch = /<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i.exec(html);
	const favicon = absolute(faviconMatch?.[1], baseUrl) ?? absolute("/favicon.ico", baseUrl);

	const rawBody = pickBody(html);
	const content = cleanContent(rawBody, baseUrl);
	const text = stripTags(content);
	const wordCount = text ? text.split(/\s+/).length : 0;

	return {
		title,
		description,
		siteName,
		author,
		coverImage,
		favicon,
		publishedAt,
		content,
		text,
		wordCount,
	};
}
