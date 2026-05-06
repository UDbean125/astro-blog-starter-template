// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
	site: "https://harbour.app",
	output: "server",
	integrations: [sitemap()],
	adapter: cloudflare({
		platformProxy: { enabled: true },
	}),
	vite: {
		build: { sourcemap: false },
	},
});
