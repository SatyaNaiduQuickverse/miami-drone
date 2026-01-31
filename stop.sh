#!/bin/bash

# Miami Police Drone Management System - Stop Script

echo "Stopping Miami Police Drone System..."

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

# Stop services using PID files
for pidfile in "$BASE_DIR/pids"/*.pid; do
    if [ -f "$pidfile" ]; then
        pid=$(cat "$pidfile")
        name=$(basename "$pidfile" .pid)
        if kill -0 "$pid" 2>/dev/null; then
            echo "Stopping $name (PID: $pid)..."
            kill "$pid"
        fi
        rm "$pidfile"
    fi
done

# Also kill any remaining processes on the ports
for port in 5000 5173 8081; do
    pid=$(lsof -t -i:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo "Killing process on port $port (PID: $pid)..."
        kill $pid 2>/dev/null
    fi
done

echo "All services stopped."
