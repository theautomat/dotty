#!/bin/bash

# Start Local Solana Validator Script
# This script starts a local Solana test validator for development

set -e

echo "🏴‍☠️ Starting Local Solana Validator..."
echo ""

# Check if solana-test-validator is installed
if ! command -v solana-test-validator &> /dev/null; then
    echo "❌ Error: solana-test-validator not found!"
    echo ""
    echo "Please install Solana CLI tools:"
    echo "  sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    echo ""
    exit 1
fi

# Kill any existing validator
echo "Checking for existing validator processes..."
pkill -9 solana-test-validator 2>/dev/null || true
sleep 2

# Clean up ledger (optional - comment out if you want to preserve state)
echo "Cleaning up old ledger data..."
rm -rf test-ledger

echo ""
echo "Starting validator on http://localhost:8899"
echo "Logs will be written to test-validator.log"
echo ""
echo "Press Ctrl+C to stop the validator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start the validator with useful settings
solana-test-validator \
  --reset \
  --ledger test-ledger \
  --log test-validator.log \
  --rpc-port 8899 \
  --faucet-port 9900 \
  --gossip-port 8001 \
  --dynamic-port-range 8002-8020 \
  --limit-ledger-size 50000000 \
  --quiet

# Note: Remove --quiet if you want to see logs in console
