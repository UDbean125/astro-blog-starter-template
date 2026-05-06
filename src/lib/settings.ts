import { DEFAULT_SETTINGS, type Settings } from "./types";

const KEY = "harbour.settings";

export function loadSettings(): Settings {
	if (typeof localStorage === "undefined") return DEFAULT_SETTINGS;
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return DEFAULT_SETTINGS;
		return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
	} catch {
		return DEFAULT_SETTINGS;
	}
}

export function saveSettings(s: Partial<Settings>) {
	if (typeof localStorage === "undefined") return;
	const next = { ...loadSettings(), ...s };
	localStorage.setItem(KEY, JSON.stringify(next));
	return next;
}

export function applyTheme(theme: Settings["theme"]) {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	const resolved = theme === "system"
		? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
		: theme;
	root.dataset.theme = resolved;
}
