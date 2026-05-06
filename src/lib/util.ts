import type { Article } from "./types";

export function readingMinutes(words: number): number {
	return Math.max(1, Math.round(words / 225));
}

export function formatRelative(ts: number): string {
	const diff = Date.now() - ts;
	const min = 60_000, h = 3_600_000, d = 86_400_000;
	if (diff < min) return "just now";
	if (diff < h) return `${Math.floor(diff / min)} min ago`;
	if (diff < d) return `${Math.floor(diff / h)} h ago`;
	if (diff < d * 7) return `${Math.floor(diff / d)} d ago`;
	const date = new Date(ts);
	return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

export function hostOf(url: string): string {
	try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export function faviconFor(url: string, explicit?: string): string {
	if (explicit) return explicit;
	try {
		const u = new URL(url);
		return `https://icons.duckduckgo.com/ip3/${u.hostname}.ico`;
	} catch { return ""; }
}

export function initials(s: string): string {
	return s.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");
}

export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number) {
	let t: ReturnType<typeof setTimeout> | undefined;
	return (...args: Parameters<T>) => {
		if (t) clearTimeout(t);
		t = setTimeout(() => fn(...args), ms);
	};
}

export function matchesQuery(a: Article, q: string): boolean {
	if (!q) return true;
	const hay = `${a.title} ${a.description ?? ""} ${a.siteName ?? ""} ${a.author ?? ""} ${a.tags.join(" ")} ${a.text ?? ""}`.toLowerCase();
	return q.toLowerCase().split(/\s+/).every(tok => hay.includes(tok));
}

export function sortArticles<T extends Article>(xs: T[], mode: string): T[] {
	const a = xs.slice();
	switch (mode) {
		case "oldest":   return a.sort((x, y) => x.savedAt - y.savedAt);
		case "title":    return a.sort((x, y) => x.title.localeCompare(y.title));
		case "unread":   return a.sort((x, y) => Number(y.isUnread) - Number(x.isUnread) || y.savedAt - x.savedAt);
		case "longest":  return a.sort((x, y) => (y.wordCount ?? 0) - (x.wordCount ?? 0));
		case "shortest": return a.sort((x, y) => (x.wordCount ?? 0) - (y.wordCount ?? 0));
		default:         return a.sort((x, y) => y.savedAt - x.savedAt);
	}
}
