#!/bin/bash

# Analyze Local Blockchain Script
# This script helps analyze transactions and accounts on local validator

set -e

echo "🏴‍☠️ Blockchain Analysis Tools..."
echo ""

# Check if validator is running
if ! curl -s http://localhost:8899 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' &> /dev/null; then
    echo "❌ Local validator is not running!"
    echo "Start it with: npm run solana:validator"
    exit 1
fi

PROGRAM_ID=$(solana address -k solana/target/deploy/game-keypair.json 2>/dev/null || echo "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS")

echo "Program ID: $PROGRAM_ID"
echo ""

# Menu
echo "Select an option:"
echo "1. View recent transactions"
echo "2. Check program account info"
echo "3. List all program accounts"
echo "4. Check treasure vault status"
echo "5. View test wallet balance"
echo "6. Get recent block info"
echo "7. Open Solana Explorer"
echo ""
read -p "Enter choice (1-7): " choice

case $choice in
    1)
        echo ""
        echo "Recent transactions on localhost:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        solana transaction-history --url http://localhost:8899 | head -20
        ;;

    2)
        echo ""
        echo "Program account info:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        solana account "$PROGRAM_ID" --url http://localhost:8899
        ;;

    3)
        echo ""
        echo "All program accounts:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        solana program show "$PROGRAM_ID" --url http://localhost:8899 --programs
        ;;

    4)
        echo ""
        echo "Querying treasure vault (uses Anchor)..."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        cd solana
        anchor account TreasureVault --provider.cluster localnet || echo "No vault found or not initialized"
        cd ..
        ;;

    5)
        echo ""
        WALLET_PATH="$HOME/.config/solana/test-wallet.json"
        if [ -f "$WALLET_PATH" ]; then
            WALLET_ADDRESS=$(solana-keygen pubkey "$WALLET_PATH")
            echo "Test wallet: $WALLET_ADDRESS"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            solana balance "$WALLET_ADDRESS" --url http://localhost:8899
        else
            echo "Test wallet not found. Run setup-local-test.sh first."
        fi
        ;;

    6)
        echo ""
        echo "Recent block info:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        solana block-production --url http://localhost:8899 | head -10
        echo ""
        solana slot --url http://localhost:8899
        ;;

    7)
        echo ""
        echo "Opening Solana Explorer for localhost..."
        echo "URL: https://explorer.solana.com/?cluster=custom&customUrl=http://localhost:8899"

        # Try to open in browser (works on macOS and some Linux systems)
        if command -v open &> /dev/null; then
            open "https://explorer.solana.com/?cluster=custom&customUrl=http://localhost:8899"
        elif command -v xdg-open &> /dev/null; then
            xdg-open "https://explorer.solana.com/?cluster=custom&customUrl=http://localhost:8899"
        else
            echo "Please open the URL manually in your browser"
        fi
        ;;

    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
