#!/bin/bash

# Always run from script location
cd "$(dirname "$0")"

echo "Starting Math Practice App..."

# Kill any existing server on port 5173 (safe cleanup)
lsof -ti tcp:5173 | xargs kill -9 2>/dev/null

# Start server in background (serve must be installed globally)
serve dist -l 5173 > /dev/null 2>&1 &

# Wait for server to start
sleep 2

# Open in Chrome app mode (clean UI)
open -a "Google Chrome" --args --app=http://localhost:5173

echo "Math Practice App is ready!"
