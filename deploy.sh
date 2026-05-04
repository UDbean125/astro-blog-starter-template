#!/bin/bash
# One-step deploy for Bryan's Daily Podcast
# Run from: ~/Desktop/"Hen Solutions LLC"/Podcasts/"Hennigan's Huddle"
set -e

echo "=== Bryan's Daily Podcast — Build & Deploy ==="
echo ""

cd "$(dirname "$0")"

# 1. Install dependencies
echo "Step 1: Installing dependencies..."
if command -v pnpm &>/dev/null; then
  pnpm install
else
  npm install
fi

# 2. Build the Astro site
echo ""
echo "Step 2: Building Astro site..."
npx astro build

# 3. Deploy to Cloudflare
echo ""
echo "Step 3: Deploying to Cloudflare Workers..."
npx wrangler deploy

echo ""
echo "=== Deploy complete! ==="
echo "Site: https://podcast.hhsolutions.cloud"
echo "Feed: https://podcast.hhsolutions.cloud/api/feed.xml"
echo ""
echo "IMPORTANT: If you haven't set secrets yet, run:"
echo "  npx wrangler secret put ANTHROPIC_API_KEY"
echo "  npx wrangler secret put ELEVENLABS_API_KEY"
