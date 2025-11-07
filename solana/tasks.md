# Dotty Solana Development Tasks

Isolated task list for Solana smart contract and NFT integration development. Work on these tasks independently to avoid conflicts with other branches.

## Priority Legend
- 🔴 **Critical** - Blocking deployment/testing
- 🟡 **High** - Important for production readiness
- 🟢 **Medium** - Quality of life improvements
- 🔵 **Low** - Nice to have features

---

## Phase 1: Testing Infrastructure Setup 🔴

### ✅ Task 1.1: Test dependencies (COMPLETED)
**Status**: ✅ Complete - Dependencies merged into root package.json

Test dependencies are now in the root `package.json` for a unified project structure:
- `chai`, `mocha`, `ts-mocha`, `ts-node`
- `@types/chai`, `@types/mocha`, `@types/bn.js`

Test scripts available from root:
- `npm run test:solana` - Run full test suite
- `npm run test:solana:local` - Test without redeployment
- `npm run test:solana:devnet` - Test against devnet

**To install**: Run `npm install` or `pnpm install` from project root.

---

### ✅ Task 1.2: TypeScript configuration (COMPLETED)
**Status**: ✅ Complete - Created at `solana/tsconfig.json`

TypeScript configuration for test files with Mocha/Chai types.

---

### ✅ Task 1.3: .gitignore (COMPLETED)
**Status**: ✅ Complete - Created at `solana/.gitignore`

Excludes build artifacts, node_modules, test ledger, etc.

---

## Phase 2: Test Suite Development 🔴

### ✅ Task 2.1: Tests directory (COMPLETED)
**Status**: ✅ Complete - Created at `solana/tests/`

---

### ✅ Task 2.2: Test suite implementation (COMPLETED)
**Status**: ✅ Complete - Created at `solana/tests/dotty-nft.ts`

Comprehensive test suite with 6 test cases:
1. ✅ Successfully mints NFT to player
2. ✅ Player receives exactly 1 NFT token
3. ✅ Creates correct Metaplex metadata
4. ✅ Fails when metadata name is empty
5. ✅ Fails when metadata URI is empty
6. ✅ Can mint multiple NFTs to same player

**To run**: `npm run test:solana` from project root

---

### ✅ Task 2.3-2.6: All test implementations (COMPLETED)
**Status**: ✅ Complete - All tests implemented in `dotty-nft.ts`

The test file includes all planned test cases with full implementation.

---

## Phase 3: Program Deployment 🔴

### Task 3.1: Build program locally
**Priority**: 🔴 Critical
**Estimated Time**: 10 minutes

```bash
cd solana
anchor build
```

**Verification**: Check for:
- `target/deploy/dotty_nft.so` (compiled program)
- `target/idl/dotty_nft.json` (IDL file)
- `target/types/dotty_nft.ts` (TypeScript types)

**If build fails**:
- Check Rust version: `rustc --version` (need 1.75+)
- Check Anchor version: `anchor --version` (need 0.30.1)
- Check for syntax errors in `lib.rs`

---

### Task 3.2: Deploy to devnet
**Priority**: 🔴 Critical
**Estimated Time**: 20 minutes

```bash
# 1. Configure devnet
solana config set --url https://api.devnet.solana.com

# 2. Check wallet balance
solana balance
# If 0, airdrop: solana airdrop 2

# 3. Deploy
anchor deploy --provider.cluster devnet
```

**Output**: Note the Program ID (e.g., `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`)

---

### Task 3.3: Update program IDs after deployment
**Priority**: 🔴 Critical
**Estimated Time**: 10 minutes

Update Program ID in three locations:

1. **programs/dotty-nft/src/lib.rs**:
```rust
declare_id!("YOUR_NEW_PROGRAM_ID");
```

2. **Anchor.toml**:
```toml
[programs.devnet]
dotty_nft = "YOUR_NEW_PROGRAM_ID"
```

3. **Root .env** (create if doesn't exist):
```bash
SOLANA_PROGRAM_ID=YOUR_NEW_PROGRAM_ID
SOLANA_NETWORK=devnet
```

**Then rebuild and redeploy**:
```bash
anchor build
anchor deploy --provider.cluster devnet
```

---

### Task 3.4: Verify deployment on Solana Explorer
**Priority**: 🟡 High
**Estimated Time**: 5 minutes

1. Visit: https://explorer.solana.com/?cluster=devnet
2. Search for your Program ID
3. Verify:
   - Program is deployed
   - Executable: Yes
   - Owner: BPFLoaderUpgradeab1e

**Screenshot** or note down the deployment for documentation.

---

## Phase 4: Backend Integration 🔴

### Task 4.1: Copy IDL to backend
**Priority**: 🔴 Critical
**Estimated Time**: 5 minutes

```bash
cd solana
cp target/idl/dotty_nft.json ../nft-idl.json
```

**Verification**: `cat ../nft-idl.json` should show valid JSON.

---

### Task 4.2: Update nft-service.js to use IDL
**Priority**: 🔴 Critical
**Estimated Time**: 1 hour
**Location**: `nft-service.js` (root directory)

Replace the simulated minting with actual program calls:

```javascript
const { Program, AnchorProvider, web3, Wallet } = require('@coral-xyz/anchor');
const idl = require('./nft-idl.json');

class NFTMintingService {
  async initialize() {
    // ... existing connection code ...

    // Add program initialization
    const wallet = new Wallet(this.backendWallet);
    const provider = new AnchorProvider(
      this.connection,
      wallet,
      { commitment: 'confirmed' }
    );

    const programId = new PublicKey(PROGRAM_ID);
    this.program = new Program(idl, programId, provider);

    console.log('Anchor program initialized');
    this.initialized = true;
  }

  async mintCollectible(playerWalletAddress, collectibleType) {
    // Replace SIMULATED code with actual program call
    // See README.md "Backend Minting Flow" section for full code
  }
}
```

**Full implementation**: See README.md § "Frontend Integration" > "Backend Minting Flow"

---

### Task 4.3: Test minting from backend
**Priority**: 🔴 Critical
**Estimated Time**: 30 minutes

Create a test script: `test-mint.js`:

```javascript
const { nftService } = require('./nft-service');

async function testMint() {
  await nftService.initialize();

  const testWallet = "YOUR_TEST_WALLET_ADDRESS";
  const result = await nftService.mintCollectible(testWallet, 'golden-fragment');

  console.log('Mint result:', result);
  console.log('View on explorer:', `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`);
}

testMint().catch(console.error);
```

Run: `node test-mint.js`

**Verification**: Check Phantom wallet or Solana Explorer for minted NFT.

---

### Task 4.4: Add backend error handling
**Priority**: 🟡 High
**Estimated Time**: 30 minutes

Add robust error handling to `nft-service.js`:

```javascript
async mintCollectible(playerWalletAddress, collectibleType) {
  try {
    // ... minting code ...
  } catch (error) {
    if (error.message.includes('insufficient funds')) {
      console.error('Backend wallet out of SOL');
      throw new Error('Service temporarily unavailable');
    }

    if (error.message.includes('already in use')) {
      console.error('Mint account collision');
      // Retry with new mint keypair
    }

    console.error('Minting error:', error);
    throw error;
  }
}
```

---

## Phase 5: Metadata & Assets 🟡

### Task 5.1: Create actual NFT artwork
**Priority**: 🟡 High
**Estimated Time**: 2-4 hours (or contract designer)

Create 3 images for collectibles:
- Golden Asteroid Fragment (gold/yellow theme)
- Crystal Energy Shard (blue/cyan theme)
- Ancient Alien Artifact (purple/mysterious theme)

**Specifications**:
- Size: 1000x1000px minimum
- Format: PNG with transparency
- File size: < 5MB each

**Tools**: Midjourney, DALL-E, Photoshop, or hire designer

---

### Task 5.2: Upload metadata to IPFS
**Priority**: 🟡 High
**Estimated Time**: 1 hour

**Option A: NFT.Storage (Free)**

1. Sign up: https://nft.storage/
2. Upload images
3. Upload metadata JSON files
4. Get IPFS URIs (e.g., `ipfs://bafybeXXX`)

**Option B: Pinata (Free tier)**

1. Sign up: https://pinata.cloud/
2. Upload via dashboard or API
3. Note down IPFS hashes

**Update metadata JSON files** with real IPFS URIs:

```json
{
  "name": "Golden Asteroid Fragment",
  "image": "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  ...
}
```

---

### Task 5.3: Update nft-service.js with real metadata URIs
**Priority**: 🟡 High
**Estimated Time**: 15 minutes

Update `COLLECTIBLE_METADATA` constant:

```javascript
const COLLECTIBLE_METADATA = {
  'golden-fragment': {
    name: 'Golden Asteroid Fragment',
    symbol: 'DOTTY',
    uri: 'ipfs://bafyYOUR_METADATA_HASH'  // Update with real IPFS URI
  },
  // ... other collectibles
};
```

---

### Task 5.4: Add metadata validation endpoint
**Priority**: 🟢 Medium
**Estimated Time**: 30 minutes
**Location**: `server.js`

Add endpoint to validate metadata before minting:

```javascript
app.get('/api/validate-metadata/:type', async (req, res) => {
  const { type } = req.params;
  const metadata = COLLECTIBLE_METADATA[type];

  if (!metadata) {
    return res.json({ valid: false, error: 'Unknown type' });
  }

  // Fetch metadata URI to verify it's accessible
  try {
    const response = await fetch(metadata.uri.replace('ipfs://', 'https://ipfs.io/ipfs/'));
    const json = await response.json();
    res.json({ valid: true, metadata: json });
  } catch (error) {
    res.json({ valid: false, error: 'Metadata not accessible' });
  }
});
```

---

## Phase 6: Security & Anti-Cheat 🟡

### Task 6.1: Implement rate limiting
**Priority**: 🟡 High
**Estimated Time**: 1 hour
**Dependencies**: Redis or in-memory store

**Option A: In-memory (simple, loses state on restart)**

```javascript
const mintHistory = new Map(); // wallet -> { type -> timestamp }

async function checkRateLimit(wallet, type) {
  const key = `${wallet}:${type}`;
  const lastMint = mintHistory.get(key);

  if (lastMint && Date.now() - lastMint < 24 * 60 * 60 * 1000) {
    throw new Error('Can only mint once per day per type');
  }

  mintHistory.set(key, Date.now());
}
```

**Option B: Redis (production-ready)**

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function checkRateLimit(wallet, type) {
  const key = `mint:${wallet}:${type}:${new Date().toDateString()}`;
  const exists = await redis.exists(key);

  if (exists) {
    throw new Error('Already minted today');
  }

  await redis.setex(key, 86400, '1'); // 24 hour expiry
}
```

---

### Task 6.2: Add signature verification
**Priority**: 🟡 High
**Estimated Time**: 2 hours

Require game client to sign mint requests:

**Frontend** (`wallet-connection.js`):
```javascript
async requestMintNFT(collectibleType) {
  const timestamp = Date.now();
  const message = `mint:${collectibleType}:${timestamp}`;

  // Sign with wallet
  const encodedMessage = new TextEncoder().encode(message);
  const signature = await window.solana.signMessage(encodedMessage);

  const response = await fetch('/api/mint-nft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress: this.publicKey,
      collectibleType,
      timestamp,
      signature: Array.from(signature.signature)
    })
  });
}
```

**Backend** (`server.js`):
```javascript
const nacl = require('tweetnacl');
const bs58 = require('bs58');

app.post('/api/mint-nft', async (req, res) => {
  const { walletAddress, collectibleType, timestamp, signature } = req.body;

  // Verify timestamp (prevent replay attacks)
  if (Math.abs(Date.now() - timestamp) > 60000) { // 1 minute window
    return res.json({ success: false, error: 'Request expired' });
  }

  // Verify signature
  const message = `mint:${collectibleType}:${timestamp}`;
  const verified = nacl.sign.detached.verify(
    new TextEncoder().encode(message),
    new Uint8Array(signature),
    bs58.decode(walletAddress)
  );

  if (!verified) {
    return res.json({ success: false, error: 'Invalid signature' });
  }

  // Proceed with minting...
});
```

---

### Task 6.3: Implement on-chain collectible tracking
**Priority**: 🟢 Medium
**Estimated Time**: 3 hours

Add a PDA to track minted collectibles per player:

**Update `lib.rs`**:
```rust
#[account]
pub struct CollectibleRecord {
    pub player: Pubkey,
    pub collectible_type: String,
    pub mint: Pubkey,
    pub minted_at: i64,
    pub bump: u8,
}

// Modify mint_collectible to create CollectibleRecord
// Check if record exists before minting (prevent duplicates)
```

This requires program redeployment.

---

### Task 6.4: Add monitoring and alerts
**Priority**: 🟢 Medium
**Estimated Time**: 2 hours

Monitor backend wallet balance and minting patterns:

```javascript
// Check wallet balance every hour
setInterval(async () => {
  const balance = await connection.getBalance(backendWallet.publicKey);
  const solBalance = balance / web3.LAMPORTS_PER_SOL;

  if (solBalance < 0.5) {
    console.error('⚠️  LOW BALANCE ALERT: ', solBalance, 'SOL');
    // Send email/Slack notification
  }
}, 60 * 60 * 1000);

// Track minting stats
let mintCount = 0;
const mintStartTime = Date.now();

// After each mint:
mintCount++;
const rate = mintCount / ((Date.now() - mintStartTime) / 1000 / 60); // per minute

if (rate > 10) {
  console.warn('⚠️  HIGH MINT RATE:', rate, 'mints/min');
  // Potential abuse - investigate
}
```

---

## Phase 7: Frontend Improvements 🟢

### Task 7.1: Fix React version mismatch
**Priority**: 🟡 High
**Estimated Time**: 15 minutes
**Location**: Root `package.json`

Update react-dom to match React version:

```bash
cd ..  # Go to root
npm install react-dom@19.2.0
```

**Verification**: `npm list react react-dom` should show matching versions.

---

### Task 7.2: Evaluate wallet adapter migration
**Priority**: 🟢 Medium
**Estimated Time**: 30 minutes (research only)

**Current**: Vanilla JS with `window.solana` (Phantom only)
**Alternative**: Wallet Adapter (supports multiple wallets)

**Pros of migration**:
- Support Phantom, Solflare, Ledger, etc.
- Better React integration
- Industry standard

**Cons**:
- Requires React refactor (game is vanilla JS)
- More complexity
- Might not be worth it if Phantom-only is acceptable

**Decision**: Document recommendation in this file.

**Recommendation**:
- **For MVP/devnet**: Keep vanilla JS (simpler)
- **For mainnet**: Consider wallet adapter for broader wallet support

---

### Task 7.3: Add loading states to wallet UI
**Priority**: 🟢 Medium
**Estimated Time**: 1 hour
**Location**: `src/components/WalletUI.js`

Improve UX during minting:

```javascript
async handleMintRequest(collectibleType) {
  this.showLoadingState('Minting NFT...');

  try {
    const result = await walletConnection.requestMintNFT(collectibleType);
    this.showSuccessState('NFT Minted!');
    this.showMintNotification(collectibleType);
  } catch (error) {
    this.showErrorState('Minting failed: ' + error.message);
  }
}

showLoadingState(message) {
  this.statusText.textContent = '⏳ ' + message;
  this.statusText.style.color = '#FFA500';
  this.connectButton.disabled = true;
}

showSuccessState(message) {
  this.statusText.textContent = '✅ ' + message;
  this.statusText.style.color = '#14F195';
  this.connectButton.disabled = false;
}

showErrorState(message) {
  this.statusText.textContent = '❌ ' + message;
  this.statusText.style.color = '#FF0000';
  this.connectButton.disabled = false;
}
```

---

### Task 7.4: Add collectible gallery/inventory UI
**Priority**: 🔵 Low
**Estimated Time**: 4 hours

Create a UI to view collected NFTs:

```javascript
class CollectibleGallery {
  async fetchPlayerNFTs(walletAddress) {
    // Fetch NFTs from Solana (using Metaplex or wallet's token accounts)
    // Display in grid layout
  }
}
```

**Libraries**: Consider using Metaplex JS SDK for fetching NFTs.

---

## Phase 8: CI/CD & DevOps 🟢

### Task 8.1: Add GitHub Actions for testing
**Priority**: 🟢 Medium
**Estimated Time**: 1 hour
**Location**: `.github/workflows/solana-tests.yml`

Create CI workflow:

```yaml
name: Solana Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable

      - name: Install Solana
        run: |
          sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"
          echo "$HOME/.local/share/solana/install/active_release/bin" >> $GITHUB_PATH

      - name: Install Anchor
        run: |
          cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
          avm install 0.30.1
          avm use 0.30.1

      - name: Run tests
        run: |
          cd solana
          anchor test
```

---

### Task 8.2: Add deployment scripts
**Priority**: 🟢 Medium
**Estimated Time**: 1 hour
**Location**: `solana/scripts/deploy.sh`

Create deployment automation:

```bash
#!/bin/bash
set -e

CLUSTER=${1:-devnet}

echo "Deploying to $CLUSTER..."

# Build
anchor build

# Deploy
anchor deploy --provider.cluster $CLUSTER

# Get program ID
PROGRAM_ID=$(solana program show <path-to-so-file> --programs | grep "Program Id" | awk '{print $3}')

echo "Deployed! Program ID: $PROGRAM_ID"
echo "Update your .env file: SOLANA_PROGRAM_ID=$PROGRAM_ID"
```

Make executable: `chmod +x scripts/deploy.sh`

Usage: `./scripts/deploy.sh devnet`

---

### Task 8.3: Add program upgrade script
**Priority**: 🟢 Medium
**Estimated Time**: 30 minutes

Create upgrade script for deployed programs:

```bash
#!/bin/bash
# scripts/upgrade.sh

CLUSTER=${1:-devnet}
PROGRAM_ID=${2}

if [ -z "$PROGRAM_ID" ]; then
  echo "Usage: ./upgrade.sh <cluster> <program-id>"
  exit 1
fi

anchor build
anchor upgrade target/deploy/dotty_nft.so \
  --provider.cluster $CLUSTER \
  --program-id $PROGRAM_ID
```

---

## Phase 9: Documentation & Maintenance 🔵

### Task 9.1: Add API documentation
**Priority**: 🟢 Medium
**Estimated Time**: 2 hours
**Location**: `solana/API.md`

Document backend API endpoints:

```markdown
# NFT Minting API

## POST /api/mint-nft
Mint a collectible NFT for a player.

**Request**:
{
  "walletAddress": "string",
  "collectibleType": "golden-fragment" | "crystal-shard" | "alien-artifact"
}

**Response**:
{
  "success": boolean,
  "signature": string,
  "mint": string,
  "message": string
}
```

---

### Task 9.2: Create troubleshooting guide
**Priority**: 🔵 Low
**Estimated Time**: 1 hour

Add common issues and solutions to README.md (already done!).

---

### Task 9.3: Add changelog
**Priority**: 🔵 Low
**Estimated Time**: 30 minutes
**Location**: `solana/CHANGELOG.md`

Track program versions and changes:

```markdown
# Changelog

## [0.1.0] - 2025-11-07
- Initial program structure
- Basic mint_collectible instruction
- Metaplex metadata integration

## [0.2.0] - TBD
- Add on-chain collectible tracking
- Implement duplicate prevention
- Add session verification
```

---

## Priority Roadmap

### ✅ Week 1: Foundation (COMPLETED)
1. ✅ Task 1.1: Test dependencies in root package.json
2. ✅ Task 1.2: Create tsconfig.json
3. ✅ Task 1.3: Create .gitignore
4. ✅ Task 2.1: Create tests directory
5. ✅ Task 2.2: Write comprehensive test suite
6. ⏭️  Task 3.1: Build program (NEXT)

### Week 2: Deployment & Backend Integration
7. ⏭️  Task 3.2: Deploy to devnet
8. ⏭️  Task 3.3: Update program IDs
9. ⏭️  Task 3.4: Verify on explorer
10. ⏭️ Task 4.1: Copy IDL to backend
11. ⏭️ Task 4.2: Update nft-service.js
12. ⏭️ Task 4.3: Test minting from backend

### Week 3: Backend Integration
13. ✅ Task 4.1: Copy IDL to backend
14. ✅ Task 4.2: Update nft-service.js
15. ✅ Task 4.3: Test minting from backend
16. ✅ Task 4.4: Add error handling

### Week 4: Production Readiness
17. ✅ Task 5.1: Create NFT artwork
18. ✅ Task 5.2: Upload to IPFS
19. ✅ Task 5.3: Update metadata URIs
20. ✅ Task 6.1: Implement rate limiting
21. ✅ Task 6.2: Add signature verification

### Future Enhancements
- Task 6.3: On-chain tracking
- Task 6.4: Monitoring
- Task 7.1-7.4: Frontend improvements
- Task 8.1-8.3: CI/CD
- Task 9.1-9.3: Documentation

---

## Integration with Main Game

**To avoid merge conflicts**, Solana work should be isolated:

### Safe to modify (Solana-specific):
- `solana/**/*` - All files in this directory
- `nft-service.js` - Backend NFT service (root)
- `nft-idl.json` - Generated IDL file (root)
- `.env` - Add Solana variables only

### Coordinate before modifying:
- `src/utils/wallet-connection.js` - Shared with main game
- `src/components/WalletUI.js` - Shared with main game
- `server.js` - Shared Express server
- `package.json` - May have conflicts with other dependencies

### Best practice:
1. Always work in `solana/` directory for contract work
2. For backend integration (nft-service.js), create PR and tag team
3. For frontend changes, sync with main game developers
4. Use feature flags for Solana features:
   ```javascript
   const ENABLE_SOLANA_NFT = process.env.ENABLE_SOLANA_NFT === 'true';
   ```

---

## Questions & Notes

### Open Questions
- [ ] Should we use IPFS or Arweave for mainnet? (Arweave recommended)
- [ ] Do we need multi-wallet support or is Phantom-only acceptable?
- [ ] What's the target deployment date for devnet vs mainnet?
- [ ] Should we implement a marketplace for trading NFTs?

### Technical Decisions Made
- ✅ Backend-controlled minting (server pays gas)
- ✅ Phantom wallet only (for MVP)
- ✅ Using Metaplex Token Metadata standard
- ✅ Anchor framework 0.30.1

### Resources Needed
- [ ] Designer for NFT artwork (or AI generation budget)
- [ ] IPFS/Arweave hosting account
- [ ] SOL for devnet testing (free via airdrop)
- [ ] SOL for mainnet deployment (~2-5 SOL)

---

**Last Updated**: 2025-11-07
**Total Estimated Time**: ~30-40 hours
**Status**: Ready to begin Phase 1
