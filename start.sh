#!/bin/bash

# AI Event Planner - Start Script
# =================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║      🎪 AI Event Planner                ║${NC}"
echo -e "${PURPLE}║      Smart Event Management Platform     ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════╝${NC}"
echo ""

# ---- Clean up used ports ----
echo -e "${YELLOW}🔧 Cleaning up ports...${NC}"

cleanup_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "${RED}   Killing processes on port $port: $pids${NC}"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

cleanup_port 3000
cleanup_port 3001

echo -e "${GREEN}   Ports 3000 and 3001 are clean${NC}"

# ---- Check PostgreSQL ----
echo -e "${YELLOW}🐘 Checking PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
  echo -e "${RED}   PostgreSQL not found. Please install PostgreSQL.${NC}"
  exit 1
fi

# Try to start PostgreSQL if not running
if ! pg_isready -q 2>/dev/null; then
  echo -e "${YELLOW}   Starting PostgreSQL...${NC}"
  brew services start postgresql@14 2>/dev/null || \
  brew services start postgresql 2>/dev/null || \
  pg_ctl -D /usr/local/var/postgres start 2>/dev/null || \
  pg_ctl -D /opt/homebrew/var/postgres start 2>/dev/null || true
  sleep 2
fi

if pg_isready -q 2>/dev/null; then
  echo -e "${GREEN}   PostgreSQL is running${NC}"
else
  echo -e "${RED}   PostgreSQL is not running. Please start it manually.${NC}"
  exit 1
fi

# ---- Load .env ----
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo -e "${GREEN}   .env loaded${NC}"
else
  echo -e "${RED}   .env file not found!${NC}"
  exit 1
fi

# ---- Create database if not exists ----
echo -e "${YELLOW}🗄️  Setting up database...${NC}"
DB_EXISTS=$(psql -U ${DB_USER:-postgres} -lqt 2>/dev/null | cut -d \| -f 1 | grep -w "${DB_NAME:-ai_event_planner}" | wc -l | tr -d ' ')
if [ "$DB_EXISTS" = "0" ]; then
  echo -e "${CYAN}   Creating database ${DB_NAME:-ai_event_planner}...${NC}"
  createdb -U ${DB_USER:-postgres} ${DB_NAME:-ai_event_planner} 2>/dev/null || \
  psql -U ${DB_USER:-postgres} -c "CREATE DATABASE ${DB_NAME:-ai_event_planner};" 2>/dev/null || true
fi
echo -e "${GREEN}   Database ready${NC}"

# ---- Install dependencies ----
echo -e "${YELLOW}📦 Installing dependencies...${NC}"

cd "$SCRIPT_DIR/backend"
if [ ! -d "node_modules" ]; then
  echo -e "${CYAN}   Installing backend dependencies...${NC}"
  npm install --silent 2>&1 | tail -1
else
  echo -e "${GREEN}   Backend dependencies already installed${NC}"
fi

cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  echo -e "${CYAN}   Installing frontend dependencies...${NC}"
  npm install --silent 2>&1 | tail -1
else
  echo -e "${GREEN}   Frontend dependencies already installed${NC}"
fi

cd "$SCRIPT_DIR"

# ---- Seed database ----
echo -e "${YELLOW}🌱 Seeding database...${NC}"
cd "$SCRIPT_DIR/backend"
node seed.js
cd "$SCRIPT_DIR"

# ---- Start Backend with hot reload ----
echo -e "${YELLOW}🚀 Starting backend (port ${BACKEND_PORT:-3001}) with hot reload...${NC}"
cd "$SCRIPT_DIR/backend"
npx nodemon server.js &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

sleep 2

# ---- Start Frontend with hot reload ----
echo -e "${YELLOW}🚀 Starting frontend (port ${FRONTEND_PORT:-3000}) with hot reload...${NC}"
cd "$SCRIPT_DIR/frontend"
BROWSER=none PORT=${FRONTEND_PORT:-3000} npm start &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ AI Event Planner is running!         ║${NC}"
echo -e "${GREEN}║                                          ║${NC}"
echo -e "${GREEN}║  Frontend: http://localhost:${FRONTEND_PORT:-3000}          ║${NC}"
echo -e "${GREEN}║  Backend:  http://localhost:${BACKEND_PORT:-3001}          ║${NC}"
echo -e "${GREEN}║                                          ║${NC}"
echo -e "${GREEN}║  Login: admin@eventplanner.com           ║${NC}"
echo -e "${GREEN}║  Password: password123                   ║${NC}"
echo -e "${GREEN}║                                          ║${NC}"
echo -e "${GREEN}║  Hot reload enabled for both servers     ║${NC}"
echo -e "${GREEN}║  Press Ctrl+C to stop all services       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ---- Handle shutdown ----
cleanup() {
  echo ""
  echo -e "${YELLOW}🛑 Shutting down...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  cleanup_port 3000
  cleanup_port 3001
  echo -e "${GREEN}   All services stopped. Goodbye! 👋${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
