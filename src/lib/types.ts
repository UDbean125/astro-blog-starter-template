export type ArticleStatus = "inbox" | "reading" | "archived" | "trashed";
export type ViewMode = "list" | "grid" | "moodboard";
export type SortMode = "newest" | "oldest" | "title" | "unread" | "longest" | "shortest";
export type ArticleType = "article" | "pdf" | "video" | "podcast" | "note";

export interface Highlight {
	id: string;
	articleId: string;
	text: string;
	note?: string;
	color: "yellow" | "coral" | "sea" | "navy";
	createdAt: number;
	/** CSS text anchor (serialized Range) – start/end offsets in the article body */
	anchor?: { start: number; end: number };
}

export interface Article {
	id: string;
	url: string;
	title: string;
	description?: string;
	siteName?: string;
	author?: string;
	coverImage?: string;
	favicon?: string;
	publishedAt?: number;
	savedAt: number;
	updatedAt: number;
	/** Readable HTML stripped of junk */
	content?: string;
	/** Plain text for search */
	text?: string;
	wordCount?: number;
	readingMinutes?: number;
	tags: string[];
	collections: string[];
	status: ArticleStatus;
	type: ArticleType;
	isFavorite: boolean;
	isUnread: boolean;
	/** 0..1 – how far the user has read */
	progress: number;
	/** last scroll position saved */
	scrollY?: number;
	notes?: string;
	/** Duplicate detection key (normalized URL) */
	urlKey: string;
}

export interface Collection {
	id: string;
	name: string;
	icon: string;
	color?: string;
	parentId?: string;
	createdAt: number;
}

export interface Settings {
	theme: "light" | "dark" | "system";
	view: ViewMode;
	sort: SortMode;
	readerFont: "serif" | "sans" | "mono";
	readerSize: number; // 16-26
	readerLineHeight: number; // 1.4 - 2.2
	readerWidth: number; // 52-88 (ch)
	ttsRate: number; // 0.7 - 1.8
	ttsVoice?: string;
	sidebarOpen: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
	theme: "system",
	view: "grid",
	sort: "newest",
	readerFont: "serif",
	readerSize: 20,
	readerLineHeight: 1.7,
	readerWidth: 68,
	ttsRate: 1,
	sidebarOpen: true,
};
