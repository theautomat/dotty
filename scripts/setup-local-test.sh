#!/bin/bash

# Setup Local Solana Testing Environment
# This script sets up everything needed for local treasure hiding tests

set -e

echo "🏴‍☠️ Setting Up Local Solana Test Environment..."
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v solana &> /dev/null; then
    echo "❌ Error: Solana CLI not found!"
    echo "Install: sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

if ! command -v anchor &> /dev/null; then
    echo "❌ Error: Anchor CLI not found!"
    echo "Install: cargo install --git https://github.com/coral-xyz/anchor avm --locked --force"
    exit 1
fi

echo "✓ Prerequisites installed"
echo ""

# Configure Solana CLI for localhost
echo "Configuring Solana CLI for localhost..."
solana config set --url http://localhost:8899
echo "✓ Solana CLI configured for localhost"
echo ""

# Check if validator is running
echo "Checking if local validator is running..."
if ! curl -s http://localhost:8899 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' &> /dev/null; then
    echo "❌ Local validator is not running!"
    echo ""
    echo "Start it with: npm run solana:validator"
    echo "Or manually: ./scripts/start-local-validator.sh"
    exit 1
fi
echo "✓ Local validator is running"
echo ""

# Generate a new test wallet (or use existing)
WALLET_PATH="$HOME/.config/solana/test-wallet.json"

if [ -f "$WALLET_PATH" ]; then
    echo "Using existing test wallet: $WALLET_PATH"
else
    echo "Generating new test wallet..."
    solana-keygen new --no-bip39-passphrase -o "$WALLET_PATH"
fi

WALLET_ADDRESS=$(solana-keygen pubkey "$WALLET_PATH")
echo "Test wallet address: $WALLET_ADDRESS"
echo ""

# Airdrop SOL to test wallet
echo "Airdropping SOL to test wallet..."
solana airdrop 10 "$WALLET_ADDRESS" --url http://localhost:8899 || echo "⚠️ Airdrop may have failed, continuing..."
sleep 2

# Check balance
BALANCE=$(solana balance "$WALLET_ADDRESS" --url http://localhost:8899)
echo "Wallet balance: $BALANCE"
echo ""

# Build and deploy the program
echo "Building Solana program..."
cd solana
anchor build

echo ""
echo "Deploying program to localhost..."
anchor deploy --provider.cluster localnet

PROGRAM_ID=$(solana address -k target/deploy/game-keypair.json)
echo ""
echo "✓ Program deployed!"
echo "Program ID: $PROGRAM_ID"
echo ""

# Initialize the vault
echo "Initializing treasure vault..."
cd ..
npm run test:solana:local -- --grep "initialize_vault"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Local test environment ready!"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:3000/hide-treasure-test.html in your browser"
echo "2. Connect your Phantom wallet (configured for localhost)"
echo "3. Request airdrop from the UI"
echo "4. Test hiding treasure!"
echo ""
echo "Run tests: npm run test:solana"
echo "View logs: tail -f test-validator.log"
echo ""
