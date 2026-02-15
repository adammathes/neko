#!/bin/bash
echo "Cleaning up test environment..."

# Kill neko backend binary if running
pkill -x "neko" || true
pkill -x "neko_server" || true

# Kill specific node processes related to vite/playwright
# We avoid pkill -f node to not kill the agent connection
pkill -f "vite" || true
pkill -f "playwright" || true

# Kill anything on ports 4994 and 5173 and 9090
fuser -k 4994/tcp || true
fuser -k 5173/tcp || true
fuser -k 9090/tcp || true

# Remove test databases
rm -f neko_test.db .data/test.db

echo "Cleanup complete."
