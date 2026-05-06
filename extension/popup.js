const $ = (id) => document.getElementById(id);

(async () => {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
	$("url").value = tab?.url || "";
	const v = await chrome.storage.sync.get(["harbourBase"]);
	$("base").value = v.harbourBase || "";
})();

$("save").addEventListener("click", async () => {
	const base = ($("base").value || "https://harbour.app").replace(/\/$/, "");
	await chrome.storage.sync.set({ harbourBase: base });
	const url = $("url").value.trim();
	if (!url) return;
	const tags = $("tags").value.trim();
	const params = new URLSearchParams({ save: url });
	if (tags) params.set("tags", tags);
	chrome.tabs.create({ url: `${base}/?${params.toString()}` });
	window.close();
});
