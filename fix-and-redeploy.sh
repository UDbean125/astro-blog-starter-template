#!/bin/bash
# Fix and redeploy Bryan's Daily Podcast
# The /api/cron endpoint is returning HTML instead of JSON
# because the Astro SSR worker needs to be rebuilt and redeployed.

set -e

cd "$(dirname "$0")"
echo "=== Bryan's Daily Podcast - Fix & Redeploy ==="
echo ""

echo "Step 1: Building Astro project..."
pnpm build 2>&1
echo "  Build complete."
echo ""

echo "Step 2: Deploying to Cloudflare Workers..."
npx wrangler deploy 2>&1
echo "  Deploy complete."
echo ""

echo "Step 3: Verifying /api/cron endpoint..."
sleep 5
RESPONSE=$(curl -s -o /dev/null -w "%{content_type}" "https://podcast.hhsolutions.cloud/api/cron" 2>/dev/null)
if echo "$RESPONSE" | grep -q "json"; then
    echo "  SUCCESS: /api/cron returns JSON"
else
    echo "  WARNING: /api/cron may still be returning HTML."
    echo "  Content-Type: $RESPONSE"
    echo "  Try: curl -s https://podcast.hhsolutions.cloud/api/cron | head -c 200"
fi
echo ""

echo "Step 4: Deploying cron worker..."
cd cron-worker
npx wrangler deploy 2>&1
echo "  Cron worker deployed."
echo ""

echo "=== Done! ==="
echo "The cron trigger will fire daily at 7:00 AM ET (11:00 UTC)."
echo "Feed URL: https://podcast.hhsolutions.cloud/api/feed.xml"
