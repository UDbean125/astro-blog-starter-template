import type { Article, Collection, Highlight } from "./types";

/**
 * IndexedDB wrapper for Harbour.
 * One DB, three stores: articles, highlights, collections.
 * Small wrapper, no library — avoids the bundle cost.
 */

const DB_NAME = "harbour";
const DB_VERSION = 1;
const STORES = {
	articles: "articles",
	highlights: "highlights",
	collections: "collections",
} as const;

type StoreName = keyof typeof STORES;

let _db: IDBDatabase | null = null;

function open(): Promise<IDBDatabase> {
	if (_db) return Promise.resolve(_db);
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORES.articles)) {
				const s = db.createObjectStore(STORES.articles, { keyPath: "id" });
				s.createIndex("urlKey", "urlKey", { unique: false });
				s.createIndex("status", "status", { unique: false });
				s.createIndex("savedAt", "savedAt", { unique: false });
			}
			if (!db.objectStoreNames.contains(STORES.highlights)) {
				const s = db.createObjectStore(STORES.highlights, { keyPath: "id" });
				s.createIndex("articleId", "articleId", { unique: false });
				s.createIndex("createdAt", "createdAt", { unique: false });
			}
			if (!db.objectStoreNames.contains(STORES.collections)) {
				db.createObjectStore(STORES.collections, { keyPath: "id" });
			}
		};
		req.onsuccess = () => {
			_db = req.result;
			resolve(_db);
		};
		req.onerror = () => reject(req.error);
	});
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
	return open().then(
		db =>
			new Promise<T>((resolve, reject) => {
				const t = db.transaction(STORES[store], mode);
				const s = t.objectStore(STORES[store]);
				const req = fn(s);
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			})
	);
}

function all<T>(store: StoreName): Promise<T[]> {
	return tx<T[]>(store, "readonly", s => s.getAll() as IDBRequest<T[]>);
}

/* ---------- Articles ---------- */

export const articles = {
	put: (a: Article) => tx(STORES.articles as StoreName, "readwrite", s => s.put(a) as unknown as IDBRequest<unknown>) as Promise<unknown>,
	get: (id: string) => tx<Article | undefined>("articles", "readonly", s => s.get(id)),
	remove: (id: string) => tx("articles", "readwrite", s => s.delete(id) as unknown as IDBRequest<unknown>),
	all: () => all<Article>("articles"),
	byUrlKey: async (key: string) => {
		const db = await open();
		return new Promise<Article[]>((resolve, reject) => {
			const t = db.transaction(STORES.articles, "readonly");
			const idx = t.objectStore(STORES.articles).index("urlKey");
			const req = idx.getAll(key);
			req.onsuccess = () => resolve(req.result as Article[]);
			req.onerror = () => reject(req.error);
		});
	},
};

/* ---------- Highlights ---------- */

export const highlights = {
	put: (h: Highlight) => tx("highlights", "readwrite", s => s.put(h) as unknown as IDBRequest<unknown>),
	remove: (id: string) => tx("highlights", "readwrite", s => s.delete(id) as unknown as IDBRequest<unknown>),
	all: () => all<Highlight>("highlights"),
	byArticle: async (articleId: string) => {
		const db = await open();
		return new Promise<Highlight[]>((resolve, reject) => {
			const t = db.transaction(STORES.highlights, "readonly");
			const idx = t.objectStore(STORES.highlights).index("articleId");
			const req = idx.getAll(articleId);
			req.onsuccess = () => resolve(req.result as Highlight[]);
			req.onerror = () => reject(req.error);
		});
	},
};

/* ---------- Collections ---------- */

export const collections = {
	put: (c: Collection) => tx("collections", "readwrite", s => s.put(c) as unknown as IDBRequest<unknown>),
	remove: (id: string) => tx("collections", "readwrite", s => s.delete(id) as unknown as IDBRequest<unknown>),
	all: () => all<Collection>("collections"),
};

/* ---------- Utilities ---------- */

/** Normalize a URL for duplicate detection. */
export function urlKey(raw: string): string {
	try {
		const u = new URL(raw);
		const host = u.hostname.replace(/^www\./, "").toLowerCase();
		const path = u.pathname.replace(/\/+$/, "").toLowerCase();
		// Drop common tracking params
		const drop = new Set(["utm_source","utm_medium","utm_campaign","utm_term","utm_content","fbclid","gclid","mc_cid","mc_eid","ref","ref_src"]);
		const search = [...u.searchParams.entries()]
			.filter(([k]) => !drop.has(k.toLowerCase()))
			.sort(([a],[b]) => a.localeCompare(b))
			.map(([k,v]) => `${k}=${v}`)
			.join("&");
		return host + path + (search ? "?" + search : "");
	} catch {
		return raw.trim().toLowerCase();
	}
}

export function newId(prefix = ""): string {
	return prefix + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function exportAll() {
	const [a, h, c] = await Promise.all([articles.all(), highlights.all(), collections.all()]);
	return {
		version: 1,
		exportedAt: Date.now(),
		articles: a,
		highlights: h,
		collections: c,
	};
}

export async function importAll(data: any): Promise<{ articles: number; highlights: number; collections: number }> {
	let a = 0, h = 0, c = 0;
	if (Array.isArray(data?.articles)) {
		for (const x of data.articles) {
			await articles.put(x);
			a++;
		}
	}
	if (Array.isArray(data?.highlights)) {
		for (const x of data.highlights) {
			await highlights.put(x);
			h++;
		}
	}
	if (Array.isArray(data?.collections)) {
		for (const x of data.collections) {
			await collections.put(x);
			c++;
		}
	}
	return { articles: a, highlights: h, collections: c };
}

export async function wipe() {
	const db = await open();
	const names = [STORES.articles, STORES.highlights, STORES.collections];
	return new Promise<void>((resolve, reject) => {
		const t = db.transaction(names, "readwrite");
		for (const n of names) t.objectStore(n).clear();
		t.oncomplete = () => resolve();
		t.onerror = () => reject(t.error);
	});
}
