#!/bin/bash

# Deploy BOOTY Token to Solana Devnet
# This script deploys the BOOTY token program and initializes it

set -e  # Exit on any error

echo "=========================================="
echo "BOOTY Token Devnet Deployment"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "Anchor.toml" ]; then
    echo "Error: Must run from solana/ directory"
    exit 1
fi

# Step 1: Configure Solana CLI for devnet
echo -e "${BLUE}Step 1: Configuring Solana CLI for devnet...${NC}"
solana config set --url https://api.devnet.solana.com
echo ""

# Step 2: Check wallet balance
echo -e "${BLUE}Step 2: Checking wallet balance...${NC}"
BALANCE=$(solana balance | awk '{print $1}')
echo "Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo -e "${YELLOW}Low balance detected. Requesting airdrop...${NC}"
    solana airdrop 2
    echo "Waiting for confirmation..."
    sleep 5
fi
echo ""

# Step 3: Build the program
echo -e "${BLUE}Step 3: Building BOOTY token program...${NC}"
anchor build
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Step 4: Deploy the program
echo -e "${BLUE}Step 4: Deploying to devnet...${NC}"
DEPLOY_OUTPUT=$(anchor deploy --provider.cluster devnet --program-name booty 2>&1)
echo "$DEPLOY_OUTPUT"

# Extract the program ID from deploy output
PROGRAM_ID=$(echo "$DEPLOY_OUTPUT" | grep "Program Id:" | awk '{print $3}')

if [ -z "$PROGRAM_ID" ]; then
    # Try alternative extraction
    PROGRAM_ID=$(solana address -k target/deploy/booty-keypair.json)
fi

echo ""
echo -e "${GREEN}✓ Deployment complete${NC}"
echo -e "${GREEN}Program ID: $PROGRAM_ID${NC}"
echo ""

# Step 5: Update Anchor.toml with the deployed program ID
echo -e "${BLUE}Step 5: Updating Anchor.toml with program ID...${NC}"
sed -i.bak "s/booty = \".*\"/booty = \"$PROGRAM_ID\"/" Anchor.toml
echo -e "${GREEN}✓ Anchor.toml updated${NC}"
echo ""

# Step 6: Update lib.rs with the program ID
echo -e "${BLUE}Step 6: Updating lib.rs with program ID...${NC}"
sed -i.bak "s/declare_id!(\".*\");/declare_id!(\"$PROGRAM_ID\");/" programs/booty/src/lib.rs
echo -e "${GREEN}✓ lib.rs updated${NC}"
echo ""

# Step 7: Rebuild with correct program ID
echo -e "${BLUE}Step 7: Rebuilding with correct program ID...${NC}"
anchor build
echo -e "${GREEN}✓ Rebuild complete${NC}"
echo ""

# Step 8: Deploy again with correct program ID
echo -e "${BLUE}Step 8: Deploying again with correct program ID...${NC}"
anchor deploy --provider.cluster devnet --program-name booty
echo -e "${GREEN}✓ Final deployment complete${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}BOOTY Token Deployment Summary${NC}"
echo "=========================================="
echo "Network: Devnet"
echo "Program ID: $PROGRAM_ID"
echo ""
echo "Next steps:"
echo "1. Initialize the token by running: npm run init-booty-devnet"
echo "2. Or manually initialize with anchor:"
echo "   anchor run initialize-booty-devnet"
echo ""
echo -e "${YELLOW}IMPORTANT: Save the Program ID above!${NC}"
echo "=========================================="
