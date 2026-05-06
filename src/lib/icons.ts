/**
 * Inline SVG icon set – 24px grid, 2px stroke, currentColor.
 * Keeping this as a TS map so any component can render an icon with
 *   <span set:html={icon('save')} />
 * without dragging in an icon library.
 */
const S = 'stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

export const ICONS: Record<string, string> = {
	anchor:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><circle cx="12" cy="5" r="3"/><path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`,
	save:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
	inbox:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.5 5h13l3 7v5a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-5z"/></svg>`,
	archive:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>`,
	star:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
	starFill:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
	highlight:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><path d="M9 11l-6 6v4h4l6-6"/><path d="M22 12l-4.5 4.5"/><path d="M14.5 4.5L19 9l-7 7-4.5-4.5z"/></svg>`,
	tag:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
	folder:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
	search:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
	plus:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
	x:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
	check:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><polyline points="20 6 9 17 4 12"/></svg>`,
	trash:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>`,
	settings:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
	grid:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
	list:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
	moodboard:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><rect x="3" y="3" width="8" height="10"/><rect x="13" y="3" width="8" height="6"/><rect x="13" y="11" width="8" height="10"/><rect x="3" y="15" width="8" height="6"/></svg>`,
	headphones:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3zM3 19a2 2 0 0 0 2 2h1v-6H3z"/></svg>`,
	play:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
	pause:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
	stop:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>`,
	sun:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
	moon:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
	download:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
	upload:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
	external:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
	more:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`,
	clock:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
	command:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>`,
	sparkle:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></svg>`,
	menu:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
	copy:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
	link:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
	book:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
	compass:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
	inboxArrow:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.5 5h13l3 7v5a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-5z"/><polyline points="9 5 12 2 15 5"/></svg>`,
	duplicate:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><rect x="3" y="3" width="13" height="13" rx="2"/><path d="M21 8v11a2 2 0 0 1-2 2H8"/></svg>`,
	keyboard:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M7 17h10"/></svg>`,
	share:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
	shuffle:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>`,
	type:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
	chevronRight:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><polyline points="9 18 15 12 9 6"/></svg>`,
	chevronDown:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><polyline points="6 9 12 15 18 9"/></svg>`,
	arrowLeft:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
	volume:
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${S}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
};

export function icon(name: keyof typeof ICONS | string, size = 24): string {
	const svg = ICONS[name] ?? ICONS.sparkle;
	return svg.replace('viewBox="0 0 24 24"', `width="${size}" height="${size}" viewBox="0 0 24 24"`);
}
