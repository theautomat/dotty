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
echo "📡 Checking local Solana validator (Solana blockchain running locally)..."

# Check if validator is running and responding correctly
# Disable exit-on-error temporarily for this check
set +e
HEALTH_RESPONSE=$(curl -s http://localhost:8899 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' 2>/dev/null)
VALIDATOR_HEALTHY=$(echo "$HEALTH_RESPONSE" | grep -c '"result":"ok"')
set -e

if [ "$VALIDATOR_HEALTHY" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Validator is running and healthy on http://localhost:8899"
else
    echo -e "${RED}✗${NC} Validator is not running"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "To start the validator, open a separate terminal and run:"
    echo ""
    echo -e "  ${GREEN}npm run solana:validator${NC}"
    echo ""
    echo "Then run this script again:"
    echo ""
    echo -e "  ${GREEN}npm run dev:local YOUR_PHANTOM_ADDRESS${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo -e "${RED}Exiting: Cannot deploy program without a running validator${NC}"
    exit 1
fi

echo ""

# ============================================================================
# 2. CHECK ANCHOR VERSION
# ============================================================================
echo "🔧 Checking Anchor version..."

# Get installed anchor version
ANCHOR_VERSION=$(anchor --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)
REQUIRED_VERSION="0.28.0"

if [ -z "$ANCHOR_VERSION" ]; then
    echo -e "${RED}✗${NC} Anchor CLI not found"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Please install Anchor CLI version $REQUIRED_VERSION"
    echo ""
    echo "Option 1 - Using cargo (requires Rust 1.75.0):"
    echo "  rustup install 1.75.0"
    echo "  rustup override set 1.75.0"
    echo "  cargo install --git https://github.com/coral-xyz/anchor --tag v0.28.0 anchor-cli --locked --force"
    echo ""
    echo "Option 2 - Using avm (Anchor Version Manager):"
    echo "  avm install 0.28.0"
    echo "  avm use 0.28.0"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
elif [ "$ANCHOR_VERSION" != "$REQUIRED_VERSION" ]; then
    echo -e "${RED}✗${NC} Anchor version mismatch"
    echo "  Current version: $ANCHOR_VERSION"
    echo "  Required version: $REQUIRED_VERSION"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "This project requires Anchor $REQUIRED_VERSION"
    echo ""
    echo "To install the correct version:"
    echo "  cargo install --git https://github.com/coral-xyz/anchor --tag v0.28.0 anchor-cli --locked --force"
    echo ""
    echo "Or with avm:"
    echo "  avm install 0.28.0 && avm use 0.28.0"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
else
    echo -e "${GREEN}✓${NC} Anchor $ANCHOR_VERSION installed"
fi

echo ""

# ============================================================================
# 3. BUILD PROGRAM
# ============================================================================
echo "🔨 Building game program (Solana smart contract)..."

cd solana
# Build program and suppress verbose output
cargo build-sbf --manifest-path=programs/game/Cargo.toml > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Game program binary built → solana/programs/game/target/deploy/game.so"
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
# 4. GENERATE IDL
# ============================================================================
echo "📝 Generating IDL file (interface definition for frontend)..."

# Create IDL directory if it doesn't exist
mkdir -p target/idl

# Remove old IDL file to avoid version conflicts
rm -f target/idl/game.json

# Generate IDL with anchor - fail if it doesn't work
# Anchor 0.28.0 uses 'parse' instead of 'build'
if anchor idl parse -f programs/game/src/lib.rs -o target/idl/game.json; then
    echo -e "${GREEN}✓${NC} IDL generated with anchor → solana/target/idl/game.json"
else
    echo -e "${RED}✗${NC} IDL generation failed!"
    echo ""
    echo "This usually means:"
    echo "  - The Rust code has compilation errors"
    echo "  - Anchor version is incompatible"
    echo "  - Missing dependencies"
    echo ""
    echo "Try running 'cd solana && anchor build' to see the actual error"
    exit 1
fi

echo ""

# ============================================================================
# 5. DEPLOY PROGRAM
# ============================================================================
echo "🚀 Deploying game program to local validator..."

solana config set --url http://localhost:8899 > /dev/null 2>&1

# Deploy program with specific keypair to ensure consistent program ID
if solana program deploy target/deploy/game.so --url http://localhost:8899 --program-id programs/game/target/deploy/game-keypair.json > deploy_output.txt 2>&1; then
    # Extract the actual program ID from deployment output
    PROGRAM_ID=$(grep "Program Id:" deploy_output.txt | awk '{print $3}')
    rm deploy_output.txt
    echo -e "${GREEN}✓${NC} Game program deployed to blockchain address: $PROGRAM_ID"
else
    echo -e "${RED}✗${NC} Deployment failed, showing errors:"
    cat deploy_output.txt
    rm deploy_output.txt
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
# 6. INITIALIZE VAULT
# ============================================================================
echo "🏦 Initializing treasure vault (admin setup)..."

# Save token mint to temp file for vault initialization
if [ ! -z "$1" ]; then
    # We'll initialize vault after creating token, but prepare now
    echo "  → Will initialize vault after token creation"
else
    echo -e "${YELLOW}⚠${NC} Skipping vault initialization (no wallet address provided)"
fi

echo ""

# ============================================================================
# 7. CREATE TEST TOKEN
# ============================================================================
echo "🪙 Creating test SPL token (TREASURE token for game testing)..."

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
    echo "Creating test token and funding wallet $WALLET_ADDRESS with 10,000 tokens..."

    # Run TypeScript script to create token (suppress npx noise, keep script output)
    npx ts-node scripts/create-test-token.ts "$WALLET_ADDRESS" 2>/dev/null

    # Read the token mint address from file
    if [ -f ".test-token-mint" ]; then
        TOKEN_MINT=$(cat .test-token-mint)
        echo -e "${GREEN}✓${NC} Test token mint address (used by frontend): $TOKEN_MINT"
        echo ""

        # Fund wallet with SOL for transaction fees
        echo "💰 Funding wallet with SOL (for transaction fees)..."
        echo "  → Target wallet: $WALLET_ADDRESS"
        echo "  → Checking current balance..."

        # Check balance before airdrop
        BALANCE_BEFORE=$(solana balance "$WALLET_ADDRESS" --url http://localhost:8899 2>/dev/null || echo "0")
        echo "  → Current balance: $BALANCE_BEFORE"

        # Perform airdrop with error handling
        echo "  → Requesting 10 SOL airdrop..."
        if solana airdrop 10 "$WALLET_ADDRESS" --url http://localhost:8899; then
            sleep 2  # Wait for transaction to process

            # Verify the airdrop succeeded
            BALANCE_AFTER=$(solana balance "$WALLET_ADDRESS" --url http://localhost:8899 2>/dev/null || echo "0")
            echo -e "${GREEN}✓${NC} Wallet funded with 10 SOL"
            echo "  → New balance: $BALANCE_AFTER"
            echo ""
            echo -e "${YELLOW}⚠${NC}  IMPORTANT: Make sure Phantom is connected to 'Localhost' network"
            echo "     In Phantom: Settings → Developer Settings → Change Network → Localhost"
        else
            echo -e "${RED}✗${NC} Airdrop failed!"
            echo "  This might be normal if the wallet already has SOL"
            BALANCE_AFTER=$(solana balance "$WALLET_ADDRESS" --url http://localhost:8899 2>/dev/null || echo "unknown")
            echo "  Current balance: $BALANCE_AFTER"
        fi
        echo ""

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

        # Initialize vault now that we have a token
        echo ""
        echo "🏦 Initializing treasure vault with token..."
        # We're already at project root from line 254

        # Run vault initialization (suppress stderr warnings but keep important output)
        if npx ts-node scripts/initialize-vault.ts "$TOKEN_MINT" 2>&1 | grep -v "bigint:" | grep -v "MODULE_TYPELESS_PACKAGE_JSON" | grep -v "Use \`node" | grep -v "Reparsing as ES"; then
            echo -e "${GREEN}✓${NC} Vault initialized and ready for treasure hiding"
        else
            echo -e "${RED}✗${NC} Vault initialization failed (run manually if needed)"
        fi
    else
        echo -e "${RED}✗${NC} Token creation failed"
        TOKEN_MINT="(creation failed)"
    fi
fi

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
echo ""
echo "🔍 To enable webhook testing with real transactions:"
echo "  Terminal 1: npm run firebase:emulator"
echo "  Terminal 2: FIRESTORE_EMULATOR_HOST=localhost:8080 npm run server:dev"
echo "  Terminal 3: npm run dev:monitor"
echo "  Then perform hide_treasure transactions via UI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
