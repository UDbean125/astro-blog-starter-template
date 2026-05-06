export function toast(message: string, duration = 2400) {
	if (typeof document === "undefined") return;
	let region = document.querySelector<HTMLDivElement>(".toast-region");
	if (!region) {
		region = document.createElement("div");
		region.className = "toast-region";
		region.setAttribute("role", "status");
		region.setAttribute("aria-live", "polite");
		document.body.appendChild(region);
	}
	const el = document.createElement("div");
	el.className = "toast";
	el.textContent = message;
	region.appendChild(el);
	setTimeout(() => {
		el.style.transition = "opacity 200ms ease, transform 200ms ease";
		el.style.opacity = "0";
		el.style.transform = "translateY(6px)";
		setTimeout(() => el.remove(), 220);
	}, duration);
}
