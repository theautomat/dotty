#!/bin/bash

# Comprehensive Local Development Setup
# This script handles everything needed for local Solana development

set -e

echo "🚀 Starting Local Development Environment..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# 1. CHECK/START VALIDATOR
# ============================================================================
echo "📡 Checking local validator..."

if curl -s http://localhost:8899 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' &> /dev/null; then
    echo -e "${GREEN}✓${NC} Validator is already running"
else
    echo -e "${YELLOW}⚠${NC} Validator not running, starting it..."

    # Check if there's a stale validator process
    if lsof -ti:8899 > /dev/null 2>&1; then
        echo "Killing stale validator process..."
        lsof -ti:8899 | xargs kill -9 || true
        sleep 2
    fi

    # Start validator in background
    cd "$(dirname "$0")/.."
    solana-test-validator --reset --quiet > test-validator.log 2>&1 &
    VALIDATOR_PID=$!
    echo "Started validator (PID: $VALIDATOR_PID)"

    # Wait for validator to be ready
    echo "Waiting for validator to start..."
    for i in {1..30}; do
        if curl -s http://localhost:8899 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' &> /dev/null; then
            echo -e "${GREEN}✓${NC} Validator is ready"
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            echo -e "${RED}✗${NC} Validator failed to start"
            exit 1
        fi
    done
fi

echo ""

# ============================================================================
# 2. BUILD PROGRAM
# ============================================================================
echo "🔨 Building Solana program..."

cd solana
cargo build-sbf --manifest-path=programs/game/Cargo.toml

# Copy binary to deploy location
mkdir -p target/deploy
cp programs/game/target/deploy/game.so target/deploy/

echo -e "${GREEN}✓${NC} Program binary built"
echo ""

# ============================================================================
# 3. GENERATE IDL
# ============================================================================
echo "📝 Generating IDL file..."

# Create IDL directory if it doesn't exist
mkdir -p target/idl

# Try to generate IDL with anchor
if anchor idl build -p game 2>/dev/null; then
    echo -e "${GREEN}✓${NC} IDL generated with anchor"
else
    echo -e "${YELLOW}⚠${NC} anchor idl build failed, creating IDL manually..."

    # Create a basic IDL from the program
    # This is a minimal IDL that matches the game program
    cat > target/idl/game.json << 'EOF'
{
  "version": "0.1.0",
  "name": "game",
  "instructions": [
    {
      "name": "hideTreasure",
      "accounts": [
        {
          "name": "depositor",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "depositorTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "vaultTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeVault",
      "accounts": [
        {
          "name": "vault",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "TreasureVault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "totalDeposits",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
}
EOF
    echo -e "${GREEN}✓${NC} IDL created manually"
fi

echo ""

# ============================================================================
# 4. DEPLOY PROGRAM
# ============================================================================
echo "🚀 Deploying program..."

solana config set --url http://localhost:8899 > /dev/null 2>&1
solana program deploy target/deploy/game.so --url http://localhost:8899

PROGRAM_ID=$(solana address -k programs/game/target/deploy/game-keypair.json)
echo -e "${GREEN}✓${NC} Program deployed: $PROGRAM_ID"
echo ""

# ============================================================================
# 5. CREATE TEST TOKEN
# ============================================================================
echo "🪙 Creating test SPL token..."

# Check if wallet address provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}⚠${NC} No wallet address provided, skipping token creation"
    echo ""
    echo "To create a test token, run with your Phantom wallet address:"
    echo "  npm run dev:local YOUR_PHANTOM_ADDRESS"
    echo ""
    TOKEN_MINT="(not created - wallet address required)"
else
    WALLET_ADDRESS=$1
    echo "Creating token for wallet: $WALLET_ADDRESS"

    # Run TypeScript script to create token (we're already in solana/ directory)
    npx ts-node scripts/create-test-token.ts "$WALLET_ADDRESS"

    # Read the token mint address from file
    if [ -f ".test-token-mint" ]; then
        TOKEN_MINT=$(cat .test-token-mint)
        echo -e "${GREEN}✓${NC} Test token ready: $TOKEN_MINT"

        # Update hide-treasure.tsx with the token mint
        cd ..
        sed -i.bak "s/const TEST_TOKEN_MINT = undefined;/const TEST_TOKEN_MINT = '$TOKEN_MINT';/" hide-treasure.tsx
        rm hide-treasure.tsx.bak 2>/dev/null || true
        echo -e "${GREEN}✓${NC} Frontend updated with token mint"
        cd solana  # Go back to solana directory to maintain consistency
    else
        echo -e "${RED}✗${NC} Token creation failed"
        TOKEN_MINT="(creation failed)"
    fi
fi

echo ""

# ============================================================================
# 6. CHECK VITE SETUP
# ============================================================================
echo "🔍 Checking Vite setup..."

# Go back to root directory to check vite config
cd ..

if [ ! -f "vite.config.mts" ]; then
    echo -e "${RED}✗${NC} vite.config.mts not found"
    exit 1
fi

echo -e "${GREEN}✓${NC} Vite config found"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ Local development environment ready!${NC}"
echo ""
echo "📋 Summary:"
echo "  Validator:   http://localhost:8899"
echo "  Program ID:  $PROGRAM_ID"
echo "  IDL:         solana/target/idl/game.json"
echo "  Binary:      solana/target/deploy/game.so"

if [ ! -z "$TOKEN_MINT" ] && [ "$TOKEN_MINT" != "(not created - wallet address required)" ]; then
    echo "  Test Token:  $TOKEN_MINT"
fi

echo ""
echo "🎯 Next step:"
echo "  Run: npm run vite"
echo "  Open: http://localhost:5173/hide-treasure.html"
echo ""

if [ -z "$1" ]; then
    echo "⚠️  Note: To test treasure hiding, re-run with your Phantom wallet address:"
    echo "  npm run dev:local YOUR_PHANTOM_ADDRESS"
    echo ""
fi

echo "💡 Tip: Validator logs in test-validator.log"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
