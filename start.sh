#!/bin/bash

# Miami Police Drone Management System - Startup Script

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     MIAMI POLICE DRONE MANAGEMENT SYSTEM                   ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Starting all services...                                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

# Function to check if a port is in use
check_port() {
    lsof -i:$1 > /dev/null 2>&1
    return $?
}

# Function to start a service
start_service() {
    local name=$1
    local dir=$2
    local cmd=$3
    local port=$4

    echo -e "${YELLOW}Starting $name...${NC}"

    if check_port $port; then
        echo -e "${RED}Port $port is already in use. $name may already be running.${NC}"
        return 1
    fi

    cd "$BASE_DIR/$dir"
    $cmd > "$BASE_DIR/logs/${name}.log" 2>&1 &
    echo $! > "$BASE_DIR/pids/${name}.pid"

    sleep 2

    if check_port $port; then
        echo -e "${GREEN}✓ $name started on port $port${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed to start $name${NC}"
        return 1
    fi
}

# Create directories for logs and pids
mkdir -p "$BASE_DIR/logs"
mkdir -p "$BASE_DIR/pids"

# Start MongoDB (if not running)
echo -e "${YELLOW}Checking MongoDB...${NC}"
if ! pgrep -x "mongod" > /dev/null; then
    sudo systemctl start mongod
    sleep 2
fi
if pgrep -x "mongod" > /dev/null; then
    echo -e "${GREEN}✓ MongoDB is running${NC}"
else
    echo -e "${RED}✗ MongoDB failed to start${NC}"
fi

# Start Backend (Express)
start_service "backend" "server" "npm start" 5000

# Start Gateway (Flask)
start_service "gateway" "gateway" "python3 app.py" 8081

# Start Frontend (Vite)
start_service "frontend" "client" "npm run dev -- --host" 5173

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Services Started Successfully!                            ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Frontend:  http://localhost:5173                          ║"
echo "║  Backend:   http://localhost:5000/api                      ║"
echo "║  Gateway:   http://localhost:8081                          ║"
echo "║                                                            ║"
echo "║  Login Credentials:                                        ║"
echo "║  Admin:    admin@miamipolice.gov / admin123                ║"
echo "║  Operator: operator@miamipolice.gov / operator123          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "View logs: tail -f $BASE_DIR/logs/*.log"
echo "Stop all: $BASE_DIR/stop.sh"
