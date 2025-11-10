#!/bin/bash

# Master development startup script
# Starts all required services for local development

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🚀 Starting Complete Development Environment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if wallet address provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Wallet address required${NC}"
    echo ""
    echo "Usage:"
    echo "  npm run dev:all YOUR_PHANTOM_WALLET_ADDRESS"
    echo ""
    echo "Example:"
    echo "  npm run dev:all 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
    echo ""
    exit 1
fi

WALLET_ADDRESS=$1

# Check if validator is already running
echo -e "${BLUE}📡 Checking for existing Solana validator...${NC}"
if curl -s http://localhost:8899 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' 2>/dev/null | grep -q '"result":"ok"'; then
    echo -e "${GREEN}✓${NC} Validator already running"
    VALIDATOR_RUNNING=true
else
    echo -e "${YELLOW}⚠${NC}  Validator not running - will start it"
    VALIDATOR_RUNNING=false
fi

echo ""

# If validator not running, we need to start everything in order
if [ "$VALIDATOR_RUNNING" = false ]; then
    echo -e "${BLUE}Step 1/2: Starting Solana validator...${NC}"
    echo -e "${YELLOW}This will run in the background. Logs: ./test-validator.log${NC}"

    # Start validator in background
    npm run solana:validator > test-validator.log 2>&1 &
    VALIDATOR_PID=$!

    # Wait for validator to be ready
    echo -n "Waiting for validator to start"
    for i in {1..30}; do
        if curl -s http://localhost:8899 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' 2>/dev/null | grep -q '"result":"ok"'; then
            echo ""
            echo -e "${GREEN}✓${NC} Validator is ready!"
            break
        fi
        echo -n "."
        sleep 2

        if [ $i -eq 30 ]; then
            echo ""
            echo -e "${RED}❌ Validator failed to start after 60 seconds${NC}"
            echo "Check logs: tail -f test-validator.log"
            kill $VALIDATOR_PID 2>/dev/null || true
            exit 1
        fi
    done
    echo ""
fi

# Run dev:local setup
echo -e "${BLUE}Step 2/2: Running dev:local setup...${NC}"
echo -e "${YELLOW}This builds and deploys the program, creates tokens, etc.${NC}"
echo ""

./scripts/dev-local.sh "$WALLET_ADDRESS"

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ dev:local setup failed${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}Now starting all development services...${NC}"
echo ""
echo "Services that will start:"
echo "  1. Firebase Emulator (localhost:8080, UI at :4000)"
echo "  2. Express Server (localhost:3000)"
echo "  3. Vite Dev Server (localhost:5173)"
echo "  4. Transaction Monitor (watching for transactions)"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""
sleep 2

# Use concurrently to run all services
# The -n flag names each process
# The -c flag colors the output
# The -p flag adds a prefix to output
# The --kill-others flag stops all processes if one fails

npx concurrently \
  -n "firebase,server,vite,monitor" \
  -c "blue,green,yellow,magenta" \
  -p "[{name}]" \
  --kill-others \
  "npm run firebase:emulator" \
  "FIRESTORE_EMULATOR_HOST=localhost:8080 npm run server:dev" \
  "npm run vite" \
  "sleep 5 && npm run dev:monitor"

# Note: The monitor has a 5 second delay to let other services start first
