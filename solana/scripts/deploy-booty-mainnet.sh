#!/bin/bash

# Deploy BOOTY Token to Solana Mainnet
# This script deploys the BOOTY token program and initializes it

set -e  # Exit on any error

echo "=========================================="
echo "BOOTY Token Mainnet Deployment"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "Anchor.toml" ]; then
    echo -e "${RED}Error: Must run from solana/ directory${NC}"
    exit 1
fi

# Warning prompt
echo -e "${RED}WARNING: You are about to deploy to MAINNET!${NC}"
echo -e "${YELLOW}This will use REAL SOL and deploy to production.${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi
echo ""

# Step 1: Configure Solana CLI for mainnet
echo -e "${BLUE}Step 1: Configuring Solana CLI for mainnet-beta...${NC}"
solana config set --url https://api.mainnet-beta.solana.com
echo ""

# Step 2: Check wallet balance
echo -e "${BLUE}Step 2: Checking wallet balance...${NC}"
BALANCE=$(solana balance | awk '{print $1}')
echo "Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 5" | bc -l) )); then
    echo -e "${RED}Error: Insufficient balance for mainnet deployment!${NC}"
    echo "Mainnet deployment requires at least 5 SOL for:"
    echo "  - Program deployment (~2-3 SOL)"
    echo "  - Account rent (~0.1 SOL)"
    echo "  - Transaction fees (~0.01 SOL)"
    echo "  - Buffer for safety"
    echo ""
    echo "Current balance: $BALANCE SOL"
    exit 1
fi
echo ""

# Step 3: Security check - verify program has been tested
echo -e "${BLUE}Step 3: Pre-deployment checklist...${NC}"
read -p "Have you tested the program on devnet? (yes/no): " TESTED_DEVNET
read -p "Have you run all tests locally? (yes/no): " TESTS_PASSED
read -p "Have you audited the code? (yes/no): " CODE_AUDITED

if [ "$TESTED_DEVNET" != "yes" ] || [ "$TESTS_PASSED" != "yes" ] || [ "$CODE_AUDITED" != "yes" ]; then
    echo -e "${RED}Error: Please complete all pre-deployment checks before deploying to mainnet!${NC}"
    exit 1
fi
echo ""

# Step 4: Build the program
echo -e "${BLUE}Step 4: Building BOOTY token program...${NC}"
anchor build --verifiable
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Step 5: Show deployment cost estimate
echo -e "${BLUE}Step 5: Estimating deployment cost...${NC}"
PROGRAM_SIZE=$(stat -f%z target/deploy/booty.so 2>/dev/null || stat -c%s target/deploy/booty.so 2>/dev/null)
ESTIMATED_COST=$(echo "scale=2; $PROGRAM_SIZE / 1024 * 0.00001" | bc)
echo "Program size: $PROGRAM_SIZE bytes"
echo "Estimated deployment cost: ~$ESTIMATED_COST SOL"
echo ""

read -p "Proceed with deployment? (yes/no): " PROCEED
if [ "$PROCEED" != "yes" ]; then
    echo "Deployment cancelled."
    exit 0
fi
echo ""

# Step 6: Deploy the program
echo -e "${BLUE}Step 6: Deploying to mainnet-beta...${NC}"
DEPLOY_OUTPUT=$(anchor deploy --provider.cluster mainnet --program-name booty 2>&1)
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

# Step 7: Update Anchor.toml with the deployed program ID
echo -e "${BLUE}Step 7: Updating Anchor.toml with program ID...${NC}"
sed -i.bak "s/\[programs.mainnet\]/[programs.mainnet]/" Anchor.toml
sed -i "s/booty = \".*\" # mainnet/booty = \"$PROGRAM_ID\" # mainnet/" Anchor.toml
echo -e "${GREEN}✓ Anchor.toml updated${NC}"
echo ""

# Step 8: Verify the deployment
echo -e "${BLUE}Step 8: Verifying deployment...${NC}"
solana program show $PROGRAM_ID
echo -e "${GREEN}✓ Verification complete${NC}"
echo ""

# Step 9: Create backup of keypair
echo -e "${BLUE}Step 9: Creating backup of program keypair...${NC}"
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp target/deploy/booty-keypair.json $BACKUP_DIR/
echo -e "${GREEN}✓ Keypair backed up to $BACKUP_DIR${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}BOOTY Token Mainnet Deployment Summary${NC}"
echo "=========================================="
echo "Network: Mainnet-Beta"
echo "Program ID: $PROGRAM_ID"
echo "Deployment Cost: ~$ESTIMATED_COST SOL"
echo "Keypair Backup: $BACKUP_DIR/booty-keypair.json"
echo ""
echo -e "${RED}CRITICAL: Secure the program keypair!${NC}"
echo "1. Store the keypair in a secure location"
echo "2. Consider using a hardware wallet for program authority"
echo "3. Never share the keypair publicly"
echo ""
echo "Next steps:"
echo "1. Initialize the token with: npm run init-booty-mainnet"
echo "2. Verify the program on Solana Explorer:"
echo "   https://explorer.solana.com/address/$PROGRAM_ID"
echo ""
echo -e "${YELLOW}IMPORTANT: Save the Program ID above!${NC}"
echo "=========================================="
