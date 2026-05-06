/**
 * Harbour client runtime (loaded on every page).
 *  - Theme + sidebar state
 *  - Keyboard shortcuts
 *  - Add-article modal (URL capture + extract)
 *  - Command bar (search + global actions)
 */

import { articles, urlKey, newId } from "../lib/db";
import type { Article } from "../lib/types";
import { applyTheme, loadSettings, saveSettings } from "../lib/settings";
import { toast } from "../lib/toast";
import { readingMinutes, faviconFor, hostOf, matchesQuery } from "../lib/util";
import { icon } from "../lib/icons";

/* ---------- Theme ---------- */
function nextTheme(cur: "light" | "dark" | "system") {
	const order = ["light", "dark", "system"] as const;
	return order[(order.indexOf(cur) + 1) % order.length];
}

function setupTheme() {
	const s = loadSettings();
	applyTheme(s.theme);

	document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]").forEach(btn => {
		btn.addEventListener("click", () => {
			const cur = loadSettings().theme;
			const t = nextTheme(cur);
			saveSettings({ theme: t });
			applyTheme(t);
			toast(`Theme: ${t}`);
		});
	});

	window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
		if (loadSettings().theme === "system") applyTheme("system");
	});
}

/* ---------- Sidebar ---------- */
function setupSidebar() {
	const side = document.querySelector<HTMLElement>("[data-sidebar]");
	if (!side) return;
	const s = loadSettings();
	side.dataset.collapsed = s.sidebarOpen ? "false" : "true";

	document.querySelectorAll<HTMLButtonElement>("[data-sidebar-toggle]").forEach(btn => {
		btn.addEventListener("click", () => {
			const open = side.dataset.collapsed !== "true";
			side.dataset.collapsed = open ? "true" : "false";
			saveSettings({ sidebarOpen: !open });
		});
	});

	document.querySelectorAll<HTMLButtonElement>("[data-mobile-menu]").forEach(btn => {
		btn.addEventListener("click", () => {
			const open = side.dataset.mobileOpen === "true";
			side.dataset.mobileOpen = open ? "false" : "true";
		});
	});

	// Close mobile sidebar when clicking a nav link
	side.querySelectorAll("a").forEach(a =>
		a.addEventListener("click", () => { side.dataset.mobileOpen = "false"; })
	);
}

/* ---------- Add article modal ---------- */
async function addArticleByUrl(rawUrl: string, tagsCsv: string): Promise<Article> {
	const url = rawUrl.trim();
	if (!/^https?:\/\//i.test(url)) throw new Error("URL must start with http(s)://");

	const key = urlKey(url);
	const existing = await articles.byUrlKey(key);

	let parsed: any = { title: url, content: "", text: "" };
	try {
		const res = await fetch("/api/extract", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ url }),
		});
		const data = await res.json() as { ok?: boolean; article?: any };
		if (data.ok && data.article) parsed = data.article;
	} catch {
		// fall through — save a minimal record
	}

	const id = existing[0]?.id ?? newId("a_");
	const tags = tagsCsv.split(",").map(t => t.trim()).filter(Boolean);

	const article: Article = {
		id,
		url,
		urlKey: key,
		title: parsed.title || url,
		description: parsed.description,
		siteName: parsed.siteName ?? hostOf(url),
		author: parsed.author,
		coverImage: parsed.coverImage,
		favicon: parsed.favicon ?? faviconFor(url),
		publishedAt: parsed.publishedAt,
		savedAt: existing[0]?.savedAt ?? Date.now(),
		updatedAt: Date.now(),
		content: parsed.content,
		text: parsed.text,
		wordCount: parsed.wordCount,
		readingMinutes: parsed.wordCount ? readingMinutes(parsed.wordCount) : undefined,
		tags: Array.from(new Set([...(existing[0]?.tags ?? []), ...tags])),
		collections: existing[0]?.collections ?? [],
		status: existing[0]?.status ?? "inbox",
		type: "article",
		isFavorite: existing[0]?.isFavorite ?? false,
		isUnread: existing[0]?.isUnread ?? true,
		progress: existing[0]?.progress ?? 0,
		scrollY: existing[0]?.scrollY,
		notes: existing[0]?.notes,
	};

	await articles.put(article);
	window.dispatchEvent(new CustomEvent("harbour:article-saved", { detail: article }));
	return article;
}

function setupAddModal() {
	const dlg = document.querySelector<HTMLDialogElement>("[data-add-modal]");
	if (!dlg) return;
	const form = dlg.querySelector<HTMLFormElement>("[data-add-form]")!;
	const urlInput = form.querySelector<HTMLInputElement>("input[name=url]")!;
	const tagsInput = form.querySelector<HTMLInputElement>("input[name=tags]")!;
	const submitBtn = form.querySelector<HTMLButtonElement>("[data-submit]")!;
	const hint = form.querySelector<HTMLParagraphElement>("[data-hint]")!;

	function open(prefill?: string) {
		urlInput.value = prefill || "";
		tagsInput.value = "";
		hint.textContent = "We'll pull the title, cover image, and readable text.";
		if (!dlg!.open) dlg!.showModal();
		setTimeout(() => urlInput.focus(), 10);
	}
	function close() { if (dlg!.open) dlg!.close(); }

	document.querySelectorAll<HTMLButtonElement>("[data-open-add]").forEach(b =>
		b.addEventListener("click", () => open())
	);
	dlg.querySelectorAll<HTMLButtonElement>("[data-close]").forEach(b =>
		b.addEventListener("click", () => close())
	);
	dlg.addEventListener("click", (e) => {
		const r = dlg.getBoundingClientRect();
		if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
	});

	// Try to prefill URL from clipboard when opening (best-effort)
	dlg.addEventListener("close", () => { urlInput.value = ""; });

	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		const url = urlInput.value.trim();
		if (!url) return;
		submitBtn.disabled = true;
		hint.textContent = "Fetching article…";
		try {
			const a = await addArticleByUrl(url, tagsInput.value);
			close();
			toast(`Saved “${a.title.length > 40 ? a.title.slice(0, 40) + "…" : a.title}”`);
		} catch (err: any) {
			hint.textContent = err?.message || "Couldn't save that link.";
		} finally {
			submitBtn.disabled = false;
		}
	});

	// Expose for bookmarklet / share targets
	(window as any).__harbourOpenAdd = open;

	// URL query ?save=<url> auto-opens the modal
	const q = new URLSearchParams(location.search);
	const presave = q.get("save");
	if (presave) {
		open(presave);
		history.replaceState({}, "", location.pathname);
	}
}

/* ---------- Command / search bar ---------- */
function setupCommandBar() {
	const dlg = document.querySelector<HTMLDialogElement>("[data-cmd-dialog]");
	if (!dlg) return;
	const input = dlg.querySelector<HTMLInputElement>("[data-cmd-input]")!;
	const results = dlg.querySelector<HTMLDivElement>("[data-cmd-results]")!;

	let items: Array<{ type: "article" | "cmd"; article?: Article; label?: string; href?: string; run?: () => void }> = [];
	let selected = 0;

	async function render(query: string) {
		const all = await articles.all();
		const filtered = query
			? all.filter(a => matchesQuery(a, query))
			: all.slice().sort((a, b) => b.savedAt - a.savedAt).slice(0, 8);

		items = [];
		const cmds: Array<{ label: string; href?: string; run?: () => void }> = [];
		if (query.startsWith(">") || !query) {
			cmds.push(
				{ label: "Save a new link", run: () => { dlg!.close(); (window as any).__harbourOpenAdd?.(); } },
				{ label: "Go to Library",   href: "/" },
				{ label: "Go to Highlights", href: "/highlights" },
				{ label: "Go to Archive",    href: "/archive" },
				{ label: "Go to Tags",       href: "/tags" },
				{ label: "Go to Collections",href: "/collections" },
				{ label: "Go to Settings",   href: "/settings" },
			);
		}

		let html = "";
		if (filtered.length) {
			html += `<div class="cmd-group">Articles</div>`;
			for (const a of filtered.slice(0, 10)) {
				const site = hostOf(a.url);
				const img = a.coverImage
					? `<img src="${a.coverImage}" alt="" loading="lazy" />`
					: `<div class="cmd-fallback">${icon("book", 24)}</div>`;
				items.push({ type: "article", article: a });
				html += `<div class="cmd-item" role="option" data-idx="${items.length - 1}">
					${img}
					<div class="cmd-main">
						<div class="cmd-title">${escapeHtml(a.title)}</div>
						<div class="cmd-sub">${escapeHtml(site)} · ${a.readingMinutes ?? "?"} min</div>
					</div>
				</div>`;
			}
		}
		if (cmds.length) {
			html += `<div class="cmd-group">Actions</div>`;
			for (const c of cmds) {
				items.push({ type: "cmd", label: c.label, href: c.href, run: c.run });
				html += `<div class="cmd-item" role="option" data-idx="${items.length - 1}">
					<div class="cmd-fallback">${icon("command", 22)}</div>
					<div class="cmd-main"><div class="cmd-title">${escapeHtml(c.label)}</div></div>
				</div>`;
			}
		}
		if (!items.length) {
			html = `<div class="cmd-empty">No matches. Try a different search.</div>`;
		}

		results.innerHTML = html;
		selected = 0;
		updateSelection();
	}

	function updateSelection() {
		results.querySelectorAll<HTMLDivElement>(".cmd-item").forEach((el, i) => {
			el.setAttribute("aria-selected", i === selected ? "true" : "false");
			if (i === selected) el.scrollIntoView({ block: "nearest" });
		});
	}

	function run(i: number) {
		const it = items[i];
		if (!it) return;
		if (it.type === "article" && it.article) {
			location.href = `/article/${it.article.id}`;
		} else if (it.href) {
			location.href = it.href;
		} else if (it.run) {
			it.run();
		}
	}

	function open() {
		if (!dlg!.open) dlg!.showModal();
		input.value = "";
		render("");
		setTimeout(() => input.focus(), 20);
	}
	function close() { if (dlg!.open) dlg!.close(); }

	document.querySelectorAll<HTMLButtonElement>("[data-open-search]").forEach(b =>
		b.addEventListener("click", open)
	);
	dlg.addEventListener("click", (e) => {
		const r = dlg.getBoundingClientRect();
		if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
	});
	results.addEventListener("click", (e) => {
		const el = (e.target as HTMLElement).closest<HTMLDivElement>(".cmd-item");
		if (!el) return;
		const idx = Number(el.dataset.idx);
		close();
		run(idx);
	});

	let t: any;
	input.addEventListener("input", () => {
		clearTimeout(t);
		t = setTimeout(() => render(input.value.trim()), 80);
	});
	input.addEventListener("keydown", (e) => {
		if (e.key === "ArrowDown") { selected = Math.min(selected + 1, items.length - 1); updateSelection(); e.preventDefault(); }
		else if (e.key === "ArrowUp") { selected = Math.max(selected - 1, 0); updateSelection(); e.preventDefault(); }
		else if (e.key === "Enter") { close(); run(selected); e.preventDefault(); }
	});

	(window as any).__harbourOpenSearch = open;
}

/* ---------- Keyboard shortcuts ---------- */
function setupShortcuts() {
	document.addEventListener("keydown", (e) => {
		const inField = e.target instanceof HTMLElement &&
			(e.target.matches("input,textarea,[contenteditable]") || e.target.closest("[contenteditable]"));
		const cmdOrCtrl = e.metaKey || e.ctrlKey;

		if (cmdOrCtrl && e.key.toLowerCase() === "k") {
			e.preventDefault();
			(window as any).__harbourOpenSearch?.();
			return;
		}
		if (inField) return;

		if (e.key === "/") { e.preventDefault(); (window as any).__harbourOpenSearch?.(); }
		else if (e.key.toLowerCase() === "n") { e.preventDefault(); (window as any).__harbourOpenAdd?.(); }
		else if (e.key === "g") {
			const handler = (ev: KeyboardEvent) => {
				const map: Record<string, string> = { l: "/", h: "/highlights", a: "/archive", t: "/tags", c: "/collections", s: "/settings", r: "/reading" };
				const to = map[ev.key.toLowerCase()];
				if (to) { location.href = to; }
				document.removeEventListener("keydown", handler, true);
			};
			document.addEventListener("keydown", handler, true);
			setTimeout(() => document.removeEventListener("keydown", handler, true), 1500);
		}
	});
}

/* ---------- PWA ---------- */
function setupServiceWorker() {
	if (!("serviceWorker" in navigator)) return;
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/sw.js").catch(() => { /* no-op */ });
	});
}

/* ---------- Share Target ---------- */
function handleShareTarget() {
	const q = new URLSearchParams(location.search);
	const shared = q.get("sharedUrl") || q.get("url") || q.get("text");
	if (shared && /^https?:\/\//i.test(shared)) {
		setTimeout(() => (window as any).__harbourOpenAdd?.(shared), 300);
		history.replaceState({}, "", location.pathname);
	}
}

/* ---------- Helpers ---------- */
function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", () => {
	setupTheme();
	setupSidebar();
	setupAddModal();
	setupCommandBar();
	setupShortcuts();
	setupServiceWorker();
	handleShareTarget();
});

export {};
