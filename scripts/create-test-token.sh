#!/bin/bash

# Create a test SPL token for hiding treasure
# This script creates a token mint and mints tokens to your wallet

set -e

echo "🪙 Creating test SPL token..."
echo ""

# Check if wallet address provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/create-test-token.sh YOUR_PHANTOM_WALLET_ADDRESS"
    echo ""
    echo "Example:"
    echo "  ./scripts/create-test-token.sh 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
    echo ""
    exit 1
fi

WALLET_ADDRESS=$1

echo "Creating token for wallet: $WALLET_ADDRESS"
echo ""

# Configure for localhost
solana config set --url http://localhost:8899 > /dev/null

# Create a temporary keypair for the mint authority
TEMP_KEYPAIR=$(mktemp)
solana-keygen new --no-bip39-passphrase -o "$TEMP_KEYPAIR" > /dev/null 2>&1

# Airdrop SOL to temp keypair for fees
echo "Funding temporary keypair..."
solana airdrop 2 $(solana-keygen pubkey "$TEMP_KEYPAIR") --url http://localhost:8899 > /dev/null
sleep 2

# Create token mint
echo "Creating token mint..."
TOKEN_MINT=$(spl-token create-token --decimals 6 --owner "$TEMP_KEYPAIR" 2>&1 | grep "Creating token" | awk '{print $3}')

if [ -z "$TOKEN_MINT" ]; then
    echo "Failed to create token mint"
    rm "$TEMP_KEYPAIR"
    exit 1
fi

echo "✓ Token mint created: $TOKEN_MINT"

# Create token account for wallet
echo "Creating token account for your wallet..."
spl-token create-account "$TOKEN_MINT" --owner "$WALLET_ADDRESS" --fee-payer "$TEMP_KEYPAIR" > /dev/null 2>&1

# Mint 10,000 tokens to wallet
echo "Minting 10,000 tokens to your wallet..."
spl-token mint "$TOKEN_MINT" 10000 --owner "$TEMP_KEYPAIR" -- "$WALLET_ADDRESS" > /dev/null 2>&1

echo "✓ Minted 10,000 tokens"
echo ""

# Update hide-treasure.tsx with the token mint
echo "Updating hide-treasure.tsx..."
sed -i.bak "s/const TEST_TOKEN_MINT = undefined;/const TEST_TOKEN_MINT = '$TOKEN_MINT';/" hide-treasure.tsx

echo "✓ Updated hide-treasure.tsx"
echo ""

# Clean up
rm "$TEMP_KEYPAIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Test token ready!"
echo ""
echo "Token Mint:    $TOKEN_MINT"
echo "Your Balance:  10,000 tokens"
echo ""
echo "Next steps:"
echo "1. Refresh the page: http://localhost:5173/hide-treasure.html"
echo "2. Connect your Phantom wallet"
echo "3. You should now see the Hide Treasure button!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
