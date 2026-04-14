#!/bin/bash
cd "$(dirname "$0")"

# Kill any existing server (safe cleanup)
pkill -f "serve app" 2>/dev/null

# Start local server
serve app -l 5173 &

# Wait for server to start
sleep 2

# Open in Chrome app mode
open -a "Google Chrome" --args --app=http://localhost:5173
