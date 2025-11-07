#!/bin/bash
# Deployment script for Dotty Solana programs
# Usage: ./scripts/deploy.sh [devnet|mainnet]

set -e  # Exit on error

CLUSTER=${1:-devnet}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOLANA_DIR="$(dirname "$SCRIPT_DIR")"

echo "================================"
echo "Dotty Solana Program Deployment"
echo "================================"
echo "Cluster: $CLUSTER"
echo "Directory: $SOLANA_DIR"
echo ""

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Error: Anchor CLI not found"
    echo "   Install with: cargo install --git https://github.com/coral-xyz/anchor avm --locked"
    exit 1
fi

# Check if Solana is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Error: Solana CLI not found"
    echo "   Install with: sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
fi

echo "✓ Anchor version: $(anchor --version)"
echo "✓ Solana version: $(solana --version)"
echo ""

# Configure Solana cluster
echo "📡 Configuring Solana for $CLUSTER..."
if [ "$CLUSTER" == "mainnet" ]; then
    solana config set --url https://api.mainnet-beta.solana.com
else
    solana config set --url https://api.devnet.solana.com
fi

# Check wallet balance
WALLET=$(solana address)
BALANCE=$(solana balance --lamports | awk '{print $1}')
BALANCE_SOL=$(echo "scale=4; $BALANCE / 1000000000" | bc)

echo "💰 Wallet: $WALLET"
echo "💰 Balance: $BALANCE_SOL SOL"

if [ "$BALANCE" -lt 2000000000 ]; then
    echo "⚠️  Warning: Low balance ($BALANCE_SOL SOL)"
    if [ "$CLUSTER" == "devnet" ]; then
        echo "   Run: solana airdrop 2"
    else
        echo "   Please fund your wallet with at least 2 SOL for deployment"
        exit 1
    fi
fi
echo ""

# Build programs
echo "🔨 Building programs..."
cd "$SOLANA_DIR"
anchor build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✓ Programs built successfully"
echo ""

# Deploy programs
echo "🚀 Deploying programs to $CLUSTER..."
anchor deploy --provider.cluster "$CLUSTER"

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo ""
echo "✅ Deployment successful!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the program IDs from above"
echo "2. Update programs/*/src/lib.rs - declare_id!(\"...\") "
echo "3. Update Anchor.toml - [programs.$CLUSTER]"
echo "4. Update root .env - DOTTY_NFT_PROGRAM_ID= and TREASURE_DEPOSIT_PROGRAM_ID="
echo "5. Rebuild: anchor build"
echo "6. Redeploy: anchor deploy --provider.cluster $CLUSTER"
echo ""
echo "🔍 Verify on Solana Explorer:"
if [ "$CLUSTER" == "mainnet" ]; then
    echo "   https://explorer.solana.com/address/YOUR_PROGRAM_ID"
else
    echo "   https://explorer.solana.com/address/YOUR_PROGRAM_ID?cluster=devnet"
fi
echo ""
