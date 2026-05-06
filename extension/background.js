/* Harbour browser extension – background service worker */

const DEFAULT_BASE = "https://harbour.app";

async function getBase() {
	const v = await chrome.storage.sync.get(["harbourBase"]);
	return (v.harbourBase || DEFAULT_BASE).replace(/\/$/, "");
}

async function saveTab(tab) {
	if (!tab?.url || !/^https?:/i.test(tab.url)) return;
	const base = await getBase();
	const target = `${base}/?save=${encodeURIComponent(tab.url)}`;
	await chrome.tabs.create({ url: target, active: true });
}

chrome.runtime.onInstalled.addListener(() => {
	chrome.contextMenus.create({
		id: "harbour-save-page",
		title: "Save page to Harbour",
		contexts: ["page"]
	});
	chrome.contextMenus.create({
		id: "harbour-save-link",
		title: "Save link to Harbour",
		contexts: ["link"]
	});
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
	if (info.menuItemId === "harbour-save-page" && tab) saveTab(tab);
	else if (info.menuItemId === "harbour-save-link" && info.linkUrl) {
		const base = await getBase();
		chrome.tabs.create({ url: `${base}/?save=${encodeURIComponent(info.linkUrl)}` });
	}
});

chrome.commands.onCommand.addListener(async (cmd) => {
	if (cmd === "save-page") {
		const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
		if (tab) saveTab(tab);
	}
});

chrome.action.onClicked.addListener((tab) => { if (tab) saveTab(tab); });
