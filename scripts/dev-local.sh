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
# 1. CHECK VALIDATOR
# ============================================================================
echo "📡 Checking local validator..."

# Check if validator is running and responding correctly
# Disable exit-on-error temporarily for this check
set +e
HEALTH_RESPONSE=$(curl -s http://localhost:8899 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' 2>/dev/null)
VALIDATOR_HEALTHY=$(echo "$HEALTH_RESPONSE" | grep -c '"result":"ok"')
set -e

if [ "$VALIDATOR_HEALTHY" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Validator is running and healthy"
else
    echo -e "${RED}✗${NC} Validator is not running"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "To start the validator, open a separate terminal and run:"
    echo ""
    echo "  ${GREEN}npm run solana:validator${NC}"
    echo ""
    echo "Then run this script again:"
    echo ""
    echo "  ${GREEN}npm run dev:local YOUR_PHANTOM_ADDRESS${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${RED}Exiting: Cannot deploy program without a running validator${NC}"
    exit 1
fi

echo ""

# ============================================================================
# 2. BUILD PROGRAM
# ============================================================================
echo "🔨 Building Solana program..."

cd solana
# Build program and suppress verbose output
cargo build-sbf --manifest-path=programs/game/Cargo.toml > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Program binary built"
else
    echo -e "${RED}✗${NC} Build failed, showing errors:"
    cargo build-sbf --manifest-path=programs/game/Cargo.toml
    exit 1
fi

# Copy binary to deploy location
mkdir -p target/deploy
cp programs/game/target/deploy/game.so target/deploy/

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

# Deploy program and suppress verbose output
if solana program deploy target/deploy/game.so --url http://localhost:8899 > /dev/null 2>&1; then
    PROGRAM_ID=$(solana address -k programs/game/target/deploy/game-keypair.json)
    echo -e "${GREEN}✓${NC} Program deployed: $PROGRAM_ID"
else
    echo -e "${RED}✗${NC} Deployment failed, showing errors:"
    solana program deploy target/deploy/game.so --url http://localhost:8899
    exit 1
fi

# Add metadata field to IDL with program address
if [ -f "target/idl/game.json" ]; then
    # Use jq to add metadata field if available, otherwise use sed
    if command -v jq &> /dev/null; then
        jq --arg addr "$PROGRAM_ID" '. + {metadata: {address: $addr}}' target/idl/game.json > target/idl/game.json.tmp
        mv target/idl/game.json.tmp target/idl/game.json
    else
        # Fallback: add metadata field manually before closing brace
        sed -i.bak '$ s/}/,\n  "metadata": {\n    "address": "'"$PROGRAM_ID"'"\n  }\n}/' target/idl/game.json
        rm target/idl/game.json.bak 2>/dev/null || true
    fi
    echo -e "${GREEN}✓${NC} IDL updated with program address"
fi

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

    # Run TypeScript script to create token (suppress npx noise, keep script output)
    npx ts-node scripts/create-test-token.ts "$WALLET_ADDRESS" 2>/dev/null

    # Read the token mint address from file
    if [ -f ".test-token-mint" ]; then
        TOKEN_MINT=$(cat .test-token-mint)
        echo -e "${GREEN}✓${NC} Test token ready: $TOKEN_MINT"

        # Update config file with program ID and token mint
        cd ..
        cat > src/config/solana.ts <<EOL
/**
 * Solana Program Configuration
 * This file is auto-updated by dev-local.sh script
 */

export const SOLANA_CONFIG = {
  // Program ID - stays constant across deployments
  PROGRAM_ID: '$PROGRAM_ID',

  // Test token mint - updated by dev:local script
  TEST_TOKEN_MINT: '$TOKEN_MINT',
};
EOL
        echo -e "${GREEN}✓${NC} Config updated with program ID and token mint"
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
echo "🎯 Next steps:"
echo "  1. In a separate terminal, run: npm run vite"
echo "  2. Open: http://localhost:5173/hide-treasure.html"
echo ""

if [ -z "$1" ]; then
    echo "⚠️  Note: To test treasure hiding, re-run with your Phantom wallet address:"
    echo "  npm run dev:local YOUR_PHANTOM_ADDRESS"
    echo ""
fi

echo "💡 Tips:"
echo "  - Keep the validator running in a separate terminal to see its logs"
echo "  - Keep vite running in a separate terminal to see frontend logs"
echo "  - Validator logs are also saved to test-validator.log"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
