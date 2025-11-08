# Pirates Booty Leaderboard System Specification

**Version:** 1.0
**Last Updated:** 2025-11-08
**Status:** Specification (Pre-Implementation)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Goals and Requirements](#goals-and-requirements)
3. [System Architecture](#system-architecture)
4. [Leaderboard Categories](#leaderboard-categories)
5. [Player Profile System](#player-profile-system)
6. [Data Structures](#data-structures)
7. [Technical Implementation](#technical-implementation)
8. [Smart Contract Enhancements](#smart-contract-enhancements)
9. [API Specifications](#api-specifications)
10. [Frontend Components](#frontend-components)
11. [Implementation Roadmap](#implementation-roadmap)
12. [Cost and Resource Estimates](#cost-and-resource-estimates)

---

## System Overview

The Pirates Booty leaderboard system provides competitive rankings across multiple game metrics, allowing players to:

- **View rankings** across different competitive categories
- **Track progress** over various time periods (daily, weekly, monthly, all-time)
- **View player profiles** showing assets, transaction history, and achievements
- **Compete** for top positions in specialized categories

### Key Features

- **Multiple Leaderboard Categories**: 6 different ways to compete
- **Time-Based Rankings**: Daily, weekly, monthly, and all-time leaderboards
- **Real-Time Updates**: Leaderboard positions update within seconds of blockchain confirmation
- **Player Profiles**: Detailed view of any player's assets, history, and stats
- **Asset Tracking**: Query wallets for NFTs and BOOTY token balances
- **Historical Data**: View complete transaction history for any player

---

## Goals and Requirements

### Functional Requirements

1. **Accurate Rankings**: Leaderboard must accurately reflect on-chain game data
2. **Performance**: Leaderboard queries return in < 200ms, player profiles in < 500ms
3. **Scalability**: Support 10,000+ active players with 1000+ concurrent viewers
4. **Real-Time Updates**: Rankings update within 1-2 seconds of blockchain confirmation
5. **Multiple Categories**: Support at least 6 leaderboard categories
6. **Time Periods**: Support daily, weekly, monthly, and all-time rankings
7. **Player Profiles**: Show assets (NFTs, tokens) and complete transaction history

### Non-Functional Requirements

1. **Cost Efficiency**: Stay within $300/month infrastructure budget
2. **Reliability**: 99.9% uptime for leaderboard queries
3. **Data Integrity**: No double-counting or missed transactions
4. **Security**: Rate limiting to prevent abuse
5. **Mobile Responsive**: Work on all device sizes

---

## System Architecture

### High-Level Design

The system uses a **hybrid on-chain + off-chain architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/TS)                      │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────────┐  │
│  │  Game Client  │  │  Leaderboard  │  │  Player Profile   │  │
│  │               │  │    Component  │  │    Component      │  │
│  └───────┬───────┘  └───────┬───────┘  └─────────┬──────────┘  │
│          │                  │                    │              │
└──────────┼──────────────────┼────────────────────┼──────────────┘
           │                  │                    │
           ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER (Express.js)                      │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Wallet Service │  │  Leaderboard │  │   Cache Service  │   │
│  │                │  │    Service   │  │                  │   │
│  └────────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
└───────────┼──────────────────┼───────────────────┼─────────────┘
            │                  │                   │
            ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA INDEXER (Node.js)                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Transaction Listener → Parser → Firebase Writer          │  │
│  │  - Monitors program transactions via WebSocket            │  │
│  │  - Extracts player actions from instructions              │  │
│  │  - Updates Firebase cache in real-time                    │  │
│  │  - Recalculates leaderboard scores                        │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────┬──────────────────────────────────────┬──────────────┘
            │                                      │
            ▼                                      ▼
┌──────────────────────────┐         ┌─────────────────────────┐
│    SOLANA BLOCKCHAIN     │         │   FIREBASE FIRESTORE    │
│  ┌────────────────────┐  │         │  ┌──────────────────┐   │
│  │  Game Program      │  │         │  │ Players Cache    │   │
│  │  - Deposits        │  │         │  │ Transactions     │   │
│  │  - Claims          │  │◄────────┤  │ Leaderboards     │   │
│  │  - BOOTY minting   │  │         │  │ Global Stats     │   │
│  │  - NFT minting     │  │         │  └──────────────────┘   │
│  └────────────────────┘  │         └─────────────────────────┘
│  ┌────────────────────┐  │
│  │ Metaplex Program   │  │
│  │  - NFT metadata    │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

### Architecture Components

#### 1. **Solana Blockchain (Source of Truth)**
- All game actions recorded on-chain
- Immutable and verifiable
- Tracks deposits, claims, BOOTY minting/burning, NFT minting
- PlayerStats PDA for each player (to be added)

#### 2. **Data Indexer Service**
- Monitors Solana blockchain for game transactions
- Parses instruction data to extract player actions
- Updates Firebase cache in real-time
- Recalculates leaderboard rankings
- Runs background jobs for periodic updates

#### 3. **Firebase Firestore (Cache Layer)**
- Stores pre-calculated leaderboard rankings
- Caches player data (NFTs, tokens, stats)
- Stores transaction history
- Provides fast query responses
- Updated by indexer in real-time

#### 4. **API Layer**
- Express.js REST API
- Serves leaderboard data to frontend
- Handles player profile queries
- Implements rate limiting
- Provides caching headers

#### 5. **Frontend**
- React components for leaderboard display
- Player profile pages
- Real-time ranking updates
- Mobile-responsive design

### Design Decisions

**Why Hybrid Architecture?**

| Aspect | On-Chain Only | Off-Chain Only | Hybrid (Chosen) |
|--------|---------------|----------------|-----------------|
| Data Integrity | ✅ Perfect | ❌ Trusted DB | ✅ Verifiable |
| Query Speed | ❌ Slow (RPC) | ✅ Fast | ✅ Fast |
| Cost | ❌ High RPC fees | ✅ Low | ✅ Moderate |
| Scalability | ❌ Limited | ✅ Excellent | ✅ Excellent |
| Real-Time | ❌ Block time lag | ✅ Instant | ✅ Near-instant |

**Result:** Hybrid provides the best of both worlds - blockchain's immutability with database's performance.

---

## Leaderboard Categories

### Category 1: Treasure Baron 🏴‍☠️

**Metric:** Total value of treasure deposited (all-time)

**Description:** Rankings based on the cumulative value of all treasures buried by a player.

**Scoring Algorithm:**
```typescript
function calculateTreasureBaronScore(player: Player): number {
  return player.totalValueDeposited / 1_000_000; // Convert to base units
}
```

**Leaderboard Display:**
- Rank
- Player wallet (truncated)
- Total value deposited
- Number of deposits
- Highest single deposit
- Average deposit value

**Why This Category?**
Rewards players who contribute the most value to the game economy by burying high-value treasures.

---

### Category 2: BOOTY Tycoon 💰

**Metric:** Total BOOTY tokens earned through mining

**Description:** Rankings based on total BOOTY mined when burying treasure.

**Scoring Algorithm:**
```typescript
function calculateBootyTycoonScore(player: Player): number {
  return player.totalBootyMined / 1_000_000_000; // 9 decimals
}
```

**Leaderboard Display:**
- Rank
- Player wallet
- Total BOOTY mined
- Current BOOTY balance
- Total BOOTY burned (for travel)
- Net BOOTY (mined - burned)

**Why This Category?**
Rewards players who actively participate in the treasure burial mechanic, which is core to the game economy.

---

### Category 3: NFT Collector 🎨

**Metric:** Number and rarity of NFTs owned

**Description:** Rankings based on weighted NFT count (higher tier = more points).

**Scoring Algorithm:**
```typescript
function calculateNFTCollectorScore(player: Player): number {
  const weights = {
    collectible: 1,      // Free collectibles (Octopus, Scallywag, etc.)
    tier1: 2,            // Golden Chest (100-999 tokens)
    tier2: 5,            // Jewel Trove (1,000-9,999 tokens)
    tier3: 10,           // Ancient Map (10,000-99,999 tokens)
    tier4: 25            // Legendary Booty (100,000+ tokens)
  };

  return player.nfts.reduce((score, nft) => {
    const weight = weights[nft.type] || 1;
    return score + weight;
  }, 0);
}
```

**Leaderboard Display:**
- Rank
- Player wallet
- Total NFT score
- NFTs by tier (Tier 4: 3, Tier 3: 5, etc.)
- Rarest NFT owned

**Why This Category?**
Encourages collecting rare NFTs earned through high-value deposits, creating demand for premium rewards.

---

### Category 4: Treasure Hunter 🔍

**Metric:** Number of treasures discovered and claimed

**Description:** Rankings based on successful treasure finds.

**Scoring Algorithm:**
```typescript
function calculateTreasureHunterScore(player: Player): number {
  const basePoints = player.treasuresClaimed * 10;
  const valueBonus = player.totalValueClaimed / 1_000_000 / 100;
  const diversityBonus = player.uniquePlayersDiggedFrom * 5;

  return basePoints + valueBonus + diversityBonus;
}
```

**Leaderboard Display:**
- Rank
- Player wallet
- Treasures claimed
- Total value claimed
- Unique players discovered from (diversity bonus)
- Average treasure value

**Why This Category?**
Rewards exploration and successful treasure hunting, the core gameplay loop.

---

### Category 5: Explorer 🗺️

**Metric:** Number of unique plots visited and distance traveled

**Description:** Rankings based on map exploration.

**Scoring Algorithm:**
```typescript
function calculateExplorerScore(player: Player): number {
  const plotPoints = player.plotsVisited * 5;
  const distancePoints = player.totalDistance / 100;
  const bootySpent = player.bootySpentOnTravel / 1_000_000_000;

  return plotPoints + distancePoints + bootySpent;
}
```

**Leaderboard Display:**
- Rank
- Player wallet
- Unique plots visited
- Total distance traveled
- BOOTY spent on travel

**Status:** ⚠️ Requires smart contract enhancement (plot visit tracking)

**Why This Category?**
Encourages map exploration and BOOTY token burning, creating token demand and player engagement.

---

### Category 6: Power Player 👑

**Metric:** Weighted combination of all categories

**Description:** Overall rankings combining performance across all game aspects.

**Scoring Algorithm:**
```typescript
function calculatePowerPlayerScore(player: Player): number {
  const weights = {
    treasure: 0.30,   // Treasure Baron
    booty: 0.25,      // BOOTY Tycoon
    nft: 0.20,        // NFT Collector
    hunter: 0.15,     // Treasure Hunter
    explorer: 0.10    // Explorer
  };

  // Normalize scores to 0-1000 range
  const normalized = {
    treasure: normalize(player.treasureScore, maxScores.treasure),
    booty: normalize(player.bootyScore, maxScores.booty),
    nft: normalize(player.nftScore, maxScores.nft),
    hunter: normalize(player.hunterScore, maxScores.hunter),
    explorer: normalize(player.explorerScore, maxScores.explorer)
  };

  return (
    normalized.treasure * weights.treasure * 1000 +
    normalized.booty * weights.booty * 1000 +
    normalized.nft * weights.nft * 1000 +
    normalized.hunter * weights.hunter * 1000 +
    normalized.explorer * weights.explorer * 1000
  );
}

function normalize(value: number, max: number): number {
  return max > 0 ? Math.min(value / max, 1) : 0;
}
```

**Leaderboard Display:**
- Rank
- Player wallet
- Total power score
- Breakdown by category (bar chart)
- Strongest category
- Weakest category

**Why This Category?**
Identifies the most well-rounded players and provides an overall skill ranking.

---

### Time-Based Leaderboards

Each category supports multiple time periods:

| Period | Duration | Reset Schedule | Use Case |
|--------|----------|----------------|----------|
| **Daily** | Last 24 hours | Daily at 00:00 UTC | Short-term competition |
| **Weekly** | Last 7 days | Monday at 00:00 UTC | Medium-term goals |
| **Monthly** | Last 30 days | 1st of month at 00:00 UTC | Monthly seasons |
| **All-Time** | Since game launch | Never | Historical rankings |

**Implementation:**
- Firebase stores `lastUpdated` timestamp for each player action
- Queries filter by timestamp range
- Separate leaderboard documents per period
- Background job resets periodic leaderboards

---

## Player Profile System

### Profile Overview

Each player profile displays:

1. **Player Identity**
   - Wallet address (full + truncated display)
   - Optional ENS/Bonfida name (future)
   - Join date (first transaction)
   - Last activity timestamp

2. **Asset Summary**
   - Current BOOTY balance
   - Total NFTs owned (by tier)
   - Total value deposited
   - Total value claimed

3. **Statistics Dashboard**
   - Treasures buried: X
   - Treasures dug: X
   - BOOTY mined: X BOOTY
   - BOOTY burned: X BOOTY
   - NFTs minted: X
   - Plots visited: X (future)
   - Games played: X (future)

4. **Rankings**
   - Position in each leaderboard category
   - Percentile rank
   - Change since yesterday (↑↓)

5. **NFT Gallery**
   - Visual grid of owned NFTs
   - Grouped by type/tier
   - Click to view metadata
   - Rarity indicators

6. **Transaction History**
   - Chronological list of all game transactions
   - Type (deposit, claim, mine, burn, mint)
   - Amount
   - Timestamp
   - Transaction signature (link to explorer)
   - Pagination (20 per page)

### Profile URL Structure

```
/player/{walletAddress}
/player/{walletAddress}/nfts
/player/{walletAddress}/history
/player/{walletAddress}/rankings
```

---

## Data Structures

### Firebase Collections

#### Collection: `players`

**Document ID:** `{walletAddress}`

```typescript
interface PlayerCache {
  walletAddress: string;

  // NFT cache
  nfts: {
    lastUpdated: number; // Unix timestamp
    items: NFTData[];
    counts: {
      total: number;
      collectibles: number;
      tier1: number;
      tier2: number;
      tier3: number;
      tier4: number;
    };
  };

  // Token balances
  tokens: {
    lastUpdated: number;
    booty: {
      balance: string; // String to handle bigint
      decimals: number;
      uiAmount: number;
    };
  };

  // Game statistics
  stats: {
    lastUpdated: number;
    treasuresBuried: number;
    treasuresDug: number;
    totalBootyMined: string;
    totalBootyBurned: string;
    totalValueDeposited: string;
    totalValueClaimed: string;
    nftsMinted: number;
    plotsVisited: number;
    firstTransaction: number; // Unix timestamp
    lastTransaction: number;
  };

  // Leaderboard scores (cached for quick lookup)
  scores: {
    treasure_baron: number;
    booty_tycoon: number;
    nft_collector: number;
    treasure_hunter: number;
    explorer: number;
    power_player: number;
  };
}

interface NFTData {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  type: 'collectible' | 'tier1' | 'tier2' | 'tier3' | 'tier4';
  tier?: number;
  metadata?: {
    image: string;
    attributes: Array<{ trait_type: string; value: string }>;
  };
}
```

**Indexes:**
- `stats.totalValueDeposited` (desc)
- `stats.totalBootyMined` (desc)
- `nfts.counts.total` (desc)
- `stats.lastTransaction` (desc)

---

#### Collection: `leaderboards`

**Document ID:** `{walletAddress}_{category}_{period}`

```typescript
interface LeaderboardEntry {
  walletAddress: string;
  category: 'treasure_baron' | 'booty_tycoon' | 'nft_collector' | 'treasure_hunter' | 'explorer' | 'power_player';
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  score: number;
  rank: number; // Calculated on query
  percentile: number; // Top X%
  lastUpdated: number;

  // Category-specific details
  details?: {
    treasuresBuried?: number;
    totalValueDeposited?: string;
    bootyMined?: string;
    nftCount?: number;
    treasuresClaimed?: number;
    plotsVisited?: number;
  };
}
```

**Indexes:**
- `category` + `period` + `score` (desc) - Primary leaderboard query
- `category` + `period` + `walletAddress` - Player rank lookup
- `lastUpdated` (desc) - Stale entry cleanup

---

#### Collection: `transactions`

**Document ID:** `{signature}`

```typescript
interface TransactionCache {
  signature: string;
  playerWallet: string;
  type: 'deposit' | 'claim' | 'mine_booty' | 'burn_booty' | 'mint_nft';
  amount?: string; // For deposits, claims, BOOTY
  tier?: number; // For deposits and NFT mints
  timestamp: number; // Unix timestamp
  blockTime: number; // Solana block time
  slot: number; // Solana slot number
  indexed: boolean; // Has been processed

  // Transaction-specific data
  data?: {
    depositId?: number;
    nftMint?: string;
    fromPlot?: { x: number; y: number };
    toPlot?: { x: number; y: number };
  };
}
```

**Indexes:**
- `playerWallet` + `timestamp` (desc)
- `type` + `timestamp` (desc)
- `indexed` (asc) - For processing queue

---

#### Collection: `global_stats`

**Document ID:** `current`

```typescript
interface GlobalStats {
  totalPlayers: number; // Unique wallets
  totalDeposits: string; // Sum of all deposits
  totalClaims: string; // Sum of all claims
  totalBootyMined: string; // From BOOTY state PDA
  totalBootyBurned: string; // From BOOTY state PDA
  netBootySupply: string; // mined - burned
  totalNFTsMinted: number; // Count of NFT mints
  totalTransactions: number; // All game transactions
  lastUpdated: number; // Unix timestamp

  // High scores
  highScores: {
    treasure_baron: { wallet: string; score: number };
    booty_tycoon: { wallet: string; score: number };
    nft_collector: { wallet: string; score: number };
    treasure_hunter: { wallet: string; score: number };
    explorer: { wallet: string; score: number };
    power_player: { wallet: string; score: number };
  };
}
```

---

### API Response Formats

#### GET /api/leaderboard/:category

```typescript
interface LeaderboardResponse {
  category: string;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  count: number;
  lastUpdated: number;
  players: Array<{
    rank: number;
    walletAddress: string;
    score: number;
    percentile: number;
    details: Record<string, any>;
  }>;
}
```

#### GET /api/player/:wallet

```typescript
interface PlayerProfileResponse {
  walletAddress: string;
  joinDate: number;
  lastActivity: number;

  assets: {
    bootyBalance: string;
    nftCount: number;
    nftsByTier: {
      collectibles: number;
      tier1: number;
      tier2: number;
      tier3: number;
      tier4: number;
    };
  };

  stats: {
    treasuresBuried: number;
    treasuresDug: number;
    totalBootyMined: string;
    totalBootyBurned: string;
    totalValueDeposited: string;
    totalValueClaimed: string;
  };

  rankings: Array<{
    category: string;
    rank: number;
    score: number;
    percentile: number;
  }>;
}
```

---

## Technical Implementation

### Querying Solana Wallets for Assets

#### Method 1: NFT Queries (Metaplex DAS API - RECOMMENDED)

```typescript
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';
import { publicKey } from '@metaplex-foundation/umi';

// Initialize Umi with DAS API
const umi = createUmi(rpcUrl).use(dasApi());

async function getPlayerNFTs(walletAddress: string) {
  const owner = publicKey(walletAddress);

  // Get all assets owned by wallet
  const assets = await umi.rpc.getAssetsByOwner({
    owner,
    limit: 100,
    page: 1
  });

  return assets.items;
}
```

**Why DAS API?**
- ✅ Pre-indexed (instant results)
- ✅ Single API call for all NFTs
- ✅ Supports all Metaplex standards
- ✅ Pagination built-in

**Requirements:**
- RPC provider with DAS API support (QuickNode, Helius)
- npm install @metaplex-foundation/digital-asset-standard-api

---

#### Method 2: BOOTY Token Balance

```typescript
import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";

async function getBootyBalance(
  connection: Connection,
  walletAddress: PublicKey,
  bootyMintAddress: PublicKey
) {
  try {
    // Find the associated token account
    const tokenAccount = await getAssociatedTokenAddress(
      bootyMintAddress,
      walletAddress
    );

    // Get account info
    const accountInfo = await getAccount(connection, tokenAccount);

    // Return balance
    return accountInfo.amount.toString();
  } catch (error) {
    // Account doesn't exist = 0 balance
    return "0";
  }
}
```

---

#### Method 3: Batch Querying Multiple Wallets

```typescript
async function batchGetBootyBalances(
  rpcUrl: string,
  walletAddresses: string[],
  bootyMint: string
) {
  // Split into chunks of 256 (Solana RPC batch limit)
  const chunkSize = 256;
  const chunks = chunkArray(walletAddresses, chunkSize);

  const allResults = [];

  for (const chunk of chunks) {
    const batchRequest = chunk.map((wallet, index) => ({
      jsonrpc: "2.0",
      id: index,
      method: "getTokenAccountsByOwner",
      params: [
        wallet,
        { mint: bootyMint },
        { encoding: "jsonParsed" }
      ]
    }));

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchRequest)
    });

    const data = await response.json();
    allResults.push(...data);
  }

  return allResults;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

---

### Firebase Caching Strategy

#### Cache TTL (Time-To-Live)

```typescript
const CACHE_TTL = {
  NFT_DATA: 5 * 60 * 1000,      // 5 minutes
  TOKEN_BALANCE: 30 * 1000,      // 30 seconds (during gameplay)
  GAME_STATS: 60 * 1000,         // 1 minute
  LEADERBOARD: 5 * 60 * 1000,    // 5 minutes
  GLOBAL_STATS: 60 * 1000,       // 1 minute
  TRANSACTION_HISTORY: 60 * 60 * 1000  // 1 hour
};
```

#### Hybrid Invalidation Strategy

**1. Time-Based (Passive)**
- Check `lastUpdated` timestamp on cache reads
- If stale (older than TTL), fetch fresh data
- Simple and reliable

**2. Event-Based (Active) - RECOMMENDED**
- WebSocket subscription to player wallet account
- On account change, fetch fresh data and update cache
- Real-time updates with minimal latency

**3. Manual Invalidation**
- User clicks "Refresh" button
- Force cache bypass and fresh fetch
- Update cache with new data

#### Cache Manager Implementation

```typescript
class CacheManager {
  private db: Firestore;
  private subscriptions: Map<string, number> = new Map();

  async getPlayerData(walletAddress: string, forceRefresh = false) {
    if (!forceRefresh) {
      // Try cache first
      const cached = await this.getCached(walletAddress);
      if (cached && !this.isStale(cached)) {
        return cached;
      }
    }

    // Fetch fresh data
    const fresh = await this.fetchFresh(walletAddress);

    // Update cache
    await this.updateCache(walletAddress, fresh);

    // Set up real-time subscription if not already
    if (!this.subscriptions.has(walletAddress)) {
      this.subscribeToUpdates(walletAddress);
    }

    return fresh;
  }

  private isStale(data: any): boolean {
    const now = Date.now();
    return (
      now - data.nfts.lastUpdated > CACHE_TTL.NFT_DATA ||
      now - data.tokens.lastUpdated > CACHE_TTL.TOKEN_BALANCE
    );
  }
}
```

---

### Rate Limiting and Optimization

#### RPC Rate Limits

| Provider | Free Tier | Paid Tier |
|----------|-----------|-----------|
| Public Solana RPC | 50-100 req/10s | N/A |
| QuickNode Free | 25 req/s | 1,000 req/s (Growth: $99/mo) |
| Helius Free | 10 req/s | 100 req/s (Pro: $99/mo) |

#### Optimization Strategies

1. **Use DAS API for NFTs** - Pre-indexed, no multiple RPC calls
2. **Batch RPC requests** - Up to 256 per batch
3. **Cache aggressively** - Reduce RPC calls by 90%+
4. **WebSocket subscriptions** - Real-time updates without polling
5. **Connection pooling** - Reuse connections
6. **Request throttling** - Spread requests over time

---

## Smart Contract Enhancements

### Current State

The existing game program (`solana/programs/game/src/lib.rs`) tracks:

✅ Total deposits (vault level)
✅ Total claims (vault level)
✅ Individual deposit amounts
✅ Deposit timestamps
✅ Deposit tiers (1-4)
✅ Total BOOTY mined (global)
✅ Total BOOTY burned (global)

### Missing Data (Need to Add)

❌ Number of treasures buried per player
❌ Number of treasures dug per player
❌ Total value found by player
❌ NFT count per player
❌ Plot visits per player

### Proposed Enhancement: PlayerStats PDA

#### New Account Structure

```rust
/// Player Stats PDA: ["player-stats", player_pubkey]
#[account]
pub struct PlayerStats {
    /// Player wallet address
    pub player: Pubkey,

    /// Number of deposits made
    pub treasures_buried: u64,

    /// Number of claims made
    pub treasures_dug: u64,

    /// Sum of all deposit amounts
    pub total_value_buried: u64,

    /// Sum of all claim amounts
    pub total_value_dug: u64,

    /// Total BOOTY mined by this player
    pub total_booty_mined: u64,

    /// Total BOOTY burned by this player
    pub total_booty_burned: u64,

    /// Number of unique plots visited (future)
    pub plots_visited: u64,

    /// Number of NFTs minted to this player
    pub nfts_minted: u16,

    /// Number of games played (future)
    pub games_played: u32,

    /// Last transaction timestamp
    pub last_activity: i64,

    /// PDA bump seed
    pub bump: u8,
}

impl PlayerStats {
    pub const LEN: usize = 8 + // discriminator
        32 + // player
        8 + // treasures_buried
        8 + // treasures_dug
        8 + // total_value_buried
        8 + // total_value_dug
        8 + // total_booty_mined
        8 + // total_booty_burned
        8 + // plots_visited
        2 + // nfts_minted
        4 + // games_played
        8 + // last_activity
        1; // bump
}
```

#### Updated Instructions

**Modify `deposit_for_nft`:**

```rust
pub fn deposit_for_nft(
    ctx: Context<DepositForNFT>,
    amount: u64,
    deposit_id: i64,
) -> Result<()> {
    // ... existing deposit logic ...

    // UPDATE: Track player stats
    let player_stats = &mut ctx.accounts.player_stats;
    player_stats.treasures_buried = player_stats.treasures_buried
        .checked_add(1)
        .ok_or(ErrorCode::MathOverflow)?;
    player_stats.total_value_buried = player_stats.total_value_buried
        .checked_add(amount)
        .ok_or(ErrorCode::MathOverflow)?;
    player_stats.last_activity = Clock::get()?.unix_timestamp;

    Ok(())
}

#[derive(Accounts)]
pub struct DepositForNFT<'info> {
    // ... existing accounts ...

    /// Player stats PDA (NEW)
    #[account(
        init_if_needed,
        payer = player,
        space = PlayerStats::LEN,
        seeds = [b"player-stats", player.key().as_ref()],
        bump
    )]
    pub player_stats: Account<'info, PlayerStats>,
}
```

**Modify `claim_deposit`:**

```rust
pub fn claim_deposit(
    ctx: Context<ClaimDeposit>,
) -> Result<()> {
    // ... existing claim logic ...

    // UPDATE: Track player stats
    let player_stats = &mut ctx.accounts.player_stats;
    player_stats.treasures_dug = player_stats.treasures_dug
        .checked_add(1)
        .ok_or(ErrorCode::MathOverflow)?;
    player_stats.total_value_dug = player_stats.total_value_dug
        .checked_add(deposit.amount)
        .ok_or(ErrorCode::MathOverflow)?;
    player_stats.last_activity = Clock::get()?.unix_timestamp;

    Ok(())
}
```

**Modify `mine_booty`:**

```rust
pub fn mine_booty(
    ctx: Context<MineBooty>,
    amount: u64,
) -> Result<()> {
    // ... existing mining logic ...

    // UPDATE: Track player stats
    let player_stats = &mut ctx.accounts.player_stats;
    player_stats.total_booty_mined = player_stats.total_booty_mined
        .checked_add(amount)
        .ok_or(ErrorCode::MathOverflow)?;
    player_stats.last_activity = Clock::get()?.unix_timestamp;

    Ok(())
}
```

**Modify `burn_booty_for_travel`:**

```rust
pub fn burn_booty_for_travel(
    ctx: Context<BurnBootyForTravel>,
    amount: u64,
) -> Result<()> {
    // ... existing burn logic ...

    // UPDATE: Track player stats
    let player_stats = &mut ctx.accounts.player_stats;
    player_stats.total_booty_burned = player_stats.total_booty_burned
        .checked_add(amount)
        .ok_or(ErrorCode::MathOverflow)?;
    player_stats.last_activity = Clock::get()?.unix_timestamp;

    Ok(())
}
```

**Modify `mint_nft`:**

```rust
pub fn mint_nft(
    ctx: Context<MintNFT>,
    // ... params ...
) -> Result<()> {
    // ... existing NFT minting logic ...

    // UPDATE: Track player stats
    let player_stats = &mut ctx.accounts.player_stats;
    player_stats.nfts_minted = player_stats.nfts_minted
        .checked_add(1)
        .ok_or(ErrorCode::MathOverflow)?;
    player_stats.last_activity = Clock::get()?.unix_timestamp;

    Ok(())
}
```

### Migration Strategy

Since the program is already deployed:

1. **Deploy new program version** with PlayerStats support
2. **Keep backward compatibility** - use `init_if_needed` for PlayerStats
3. **Backfill stats** from transaction history for existing players
4. **Run migration script** to initialize PlayerStats for active players

**Migration Script:**

```typescript
async function backfillPlayerStats(
  connection: Connection,
  program: Program
) {
  // Get all unique players from deposits
  const deposits = await program.account.depositRecord.all();
  const players = new Set(deposits.map(d => d.account.player.toString()));

  for (const playerPubkey of players) {
    const player = new PublicKey(playerPubkey);

    // Calculate stats from transaction history
    const history = await getPlayerTransactionHistory(connection, player);
    const stats = calculateStatsFromHistory(history);

    // Initialize PlayerStats PDA with backfilled data
    // (This happens automatically on next transaction via init_if_needed)

    console.log(`Backfilled stats for ${playerPubkey}`);
  }
}
```

---

## API Specifications

### Endpoint: GET /api/leaderboard/:category

**Description:** Fetch leaderboard for a specific category

**Parameters:**
- `category` (path): `treasure_baron`, `booty_tycoon`, `nft_collector`, `treasure_hunter`, `explorer`, `power_player`
- `period` (query): `daily`, `weekly`, `monthly`, `all_time` (default: `all_time`)
- `limit` (query): Number of results (default: `100`, max: `1000`)
- `offset` (query): Pagination offset (default: `0`)

**Response:**

```json
{
  "category": "treasure_baron",
  "period": "all_time",
  "count": 100,
  "lastUpdated": 1699564800000,
  "players": [
    {
      "rank": 1,
      "walletAddress": "ABC123...XYZ789",
      "score": 1500000,
      "percentile": 99.5,
      "details": {
        "treasuresBuried": 45,
        "totalValueDeposited": "1500000000000"
      }
    }
  ]
}
```

---

### Endpoint: GET /api/player/:wallet

**Description:** Fetch complete player profile

**Parameters:**
- `wallet` (path): Player wallet address

**Response:**

```json
{
  "walletAddress": "ABC123...XYZ789",
  "joinDate": 1699564800000,
  "lastActivity": 1699564900000,

  "assets": {
    "bootyBalance": "150000000000",
    "nftCount": 12,
    "nftsByTier": {
      "collectibles": 5,
      "tier1": 3,
      "tier2": 2,
      "tier3": 1,
      "tier4": 1
    }
  },

  "stats": {
    "treasuresBuried": 45,
    "treasuresDug": 23,
    "totalBootyMined": "500000000000",
    "totalBootyBurned": "350000000000",
    "totalValueDeposited": "1500000000000",
    "totalValueClaimed": "890000000000"
  },

  "rankings": [
    {
      "category": "treasure_baron",
      "rank": 1,
      "score": 1500000,
      "percentile": 99.5
    },
    {
      "category": "booty_tycoon",
      "rank": 5,
      "score": 500000,
      "percentile": 98.2
    }
  ]
}
```

---

### Endpoint: GET /api/player/:wallet/nfts

**Description:** Fetch all NFTs owned by player

**Response:**

```json
{
  "walletAddress": "ABC123...XYZ789",
  "count": 12,
  "nfts": [
    {
      "mint": "NFT123...ABC",
      "name": "Legendary Booty #42",
      "symbol": "LBOOTY",
      "type": "tier4",
      "tier": 4,
      "metadata": {
        "image": "https://...",
        "attributes": [
          { "trait_type": "Tier", "value": "Legendary" },
          { "trait_type": "Deposit Amount", "value": "100000+" }
        ]
      }
    }
  ]
}
```

---

### Endpoint: GET /api/player/:wallet/history

**Description:** Fetch transaction history for player

**Parameters:**
- `limit` (query): Number of results (default: `20`, max: `100`)
- `offset` (query): Pagination offset (default: `0`)
- `type` (query): Filter by transaction type

**Response:**

```json
{
  "walletAddress": "ABC123...XYZ789",
  "count": 150,
  "transactions": [
    {
      "signature": "SIG123...ABC",
      "type": "deposit",
      "amount": "5000000000",
      "tier": 2,
      "timestamp": 1699564900000,
      "blockTime": 1699564900
    },
    {
      "signature": "SIG456...DEF",
      "type": "mine_booty",
      "amount": "1000000000",
      "timestamp": 1699564850000,
      "blockTime": 1699564850
    }
  ]
}
```

---

### Endpoint: GET /api/global-stats

**Description:** Fetch global game statistics

**Response:**

```json
{
  "totalPlayers": 5432,
  "totalDeposits": "50000000000000",
  "totalClaims": "35000000000000",
  "totalBootyMined": "10000000000000",
  "totalBootyBurned": "7000000000000",
  "netBootySupply": "3000000000000",
  "totalNFTsMinted": 1250,
  "lastUpdated": 1699564900000,

  "highScores": {
    "treasure_baron": {
      "wallet": "ABC123...XYZ",
      "score": 1500000
    },
    "booty_tycoon": {
      "wallet": "DEF456...UVW",
      "score": 800000
    }
  }
}
```

---

## Frontend Components

### Leaderboard Component

**Location:** `src/components/Leaderboard.tsx`

**Features:**
- Category selector (tabs or dropdown)
- Time period selector (daily/weekly/monthly/all-time)
- Paginated table display
- Real-time rank updates
- Click player to view profile
- Export to CSV
- Mobile responsive

**Props:**

```typescript
interface LeaderboardProps {
  category?: string; // Default: 'power_player'
  period?: 'daily' | 'weekly' | 'monthly' | 'all_time'; // Default: 'all_time'
  limit?: number; // Default: 100
  showFilters?: boolean; // Default: true
}
```

---

### Player Profile Component

**Location:** `src/components/PlayerProfile.tsx`

**Features:**
- Wallet address display with copy button
- Asset summary cards
- Statistics dashboard
- Rankings grid
- NFT gallery
- Transaction history table
- Refresh button
- Share profile button

**Props:**

```typescript
interface PlayerProfileProps {
  walletAddress: string;
  initialData?: PlayerProfileResponse; // For SSR/prefetch
}
```

---

### LeaderboardCard Component

**Location:** `src/components/LeaderboardCard.tsx`

**Features:**
- Compact leaderboard display
- Shows top 10
- "View Full Leaderboard" link
- Auto-refresh every 30 seconds

**Props:**

```typescript
interface LeaderboardCardProps {
  category: string;
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  limit?: number; // Default: 10
  autoRefresh?: boolean; // Default: true
}
```

---

## Implementation Roadmap

### Phase 1: Smart Contract Updates (Weeks 1-2)

**Tasks:**
- [ ] Design PlayerStats account structure
- [ ] Update `deposit_for_nft` to track stats
- [ ] Update `claim_deposit` to track stats
- [ ] Update `mine_booty` to track stats
- [ ] Update `burn_booty_for_travel` to track stats
- [ ] Update `mint_nft` to track stats
- [ ] Add comprehensive tests for stat tracking
- [ ] Deploy to devnet
- [ ] Test all stat tracking flows

**Deliverables:**
- Updated Rust program with PlayerStats
- Test suite for stats
- Deployed to devnet

---

### Phase 2: Firebase Setup (Week 2)

**Tasks:**
- [ ] Design Firestore schema (players, leaderboards, transactions, global_stats)
- [ ] Create collections with proper indexes
- [ ] Configure security rules
- [ ] Set up Firebase Admin SDK in backend
- [ ] Create seed data for testing

**Deliverables:**
- Firebase project configured
- Collections and indexes created
- Security rules defined

---

### Phase 3: Data Indexer Service (Weeks 2-3)

**Tasks:**
- [ ] Create Node.js indexer service
- [ ] Implement WebSocket subscription to program
- [ ] Build transaction parser for all instruction types
- [ ] Implement cache update logic
- [ ] Add error handling and retry logic
- [ ] Add logging and monitoring
- [ ] Test with devnet transactions

**Deliverables:**
- Indexer service running
- Real-time transaction monitoring
- Firebase cache updating automatically

---

### Phase 4: Wallet Query Functions (Week 3)

**Tasks:**
- [ ] Implement NFT fetching (Metaplex DAS API)
- [ ] Implement BOOTY token balance fetching
- [ ] Implement batch querying for multiple wallets
- [ ] Add rate limiting and request throttling
- [ ] Build cache manager class
- [ ] Test with multiple wallet addresses

**Deliverables:**
- Wallet query library
- Cache manager
- Rate limiting implemented

---

### Phase 5: Leaderboard Logic (Week 3-4)

**Tasks:**
- [ ] Implement score calculation for each category
- [ ] Build ranking algorithm
- [ ] Add time-based leaderboard support
- [ ] Implement percentile calculations
- [ ] Add tie-breaking logic
- [ ] Test with sample data

**Deliverables:**
- Leaderboard calculation engine
- Ranking algorithms tested
- Time-based filtering working

---

### Phase 6: API Development (Week 4-5)

**Tasks:**
- [ ] Create Express.js API server
- [ ] Implement GET /api/leaderboard/:category
- [ ] Implement GET /api/player/:wallet
- [ ] Implement GET /api/player/:wallet/nfts
- [ ] Implement GET /api/player/:wallet/history
- [ ] Implement GET /api/global-stats
- [ ] Add pagination support
- [ ] Add caching headers
- [ ] Add rate limiting
- [ ] Write API documentation

**Deliverables:**
- API server running
- All endpoints implemented
- Documentation complete

---

### Phase 7: Frontend Components (Week 5-6)

**Tasks:**
- [ ] Create Leaderboard component
- [ ] Create PlayerProfile component
- [ ] Create LeaderboardCard component
- [ ] Add category/period selectors
- [ ] Implement pagination
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add real-time updates (WebSocket)
- [ ] Make mobile responsive
- [ ] Add export to CSV

**Deliverables:**
- React components built
- Integrated with API
- Mobile responsive
- Real-time updates working

---

### Phase 8: Background Jobs (Week 6)

**Tasks:**
- [ ] Set up periodic leaderboard refresh (every 5 min)
- [ ] Set up global stats update (every 1 min)
- [ ] Set up top 100 player data refresh
- [ ] Implement job queue
- [ ] Add monitoring and alerts

**Deliverables:**
- Background jobs running
- Leaderboards auto-updating
- Monitoring in place

---

### Phase 9: Testing & Optimization (Week 7)

**Tasks:**
- [ ] Unit tests for score calculations
- [ ] Integration tests for indexer
- [ ] API endpoint tests
- [ ] Load testing (1000+ players)
- [ ] Frontend E2E tests
- [ ] Optimize Firebase queries
- [ ] Optimize RPC batching
- [ ] Monitor and optimize performance

**Deliverables:**
- Comprehensive test suite
- Performance optimizations
- Load testing results

---

### Phase 10: Launch Preparation (Week 8)

**Tasks:**
- [ ] Deploy smart contracts to mainnet
- [ ] Deploy indexer to production
- [ ] Deploy API to production
- [ ] Deploy frontend to production
- [ ] Set up monitoring and alerts
- [ ] Write user documentation
- [ ] Create troubleshooting guide
- [ ] Announce launch

**Deliverables:**
- Production deployment
- Documentation complete
- Launch announcement

---

## Cost and Resource Estimates

### Infrastructure Costs

**Monthly Recurring:**

| Service | Plan | Cost |
|---------|------|------|
| Firebase Firestore | Blaze (Pay-as-you-go) | $50-200 |
| Solana RPC (QuickNode) | Growth (1,000 req/s) | $99 |
| Server Hosting (Indexer) | AWS t3.medium | $30-40 |
| Domain & SSL | - | $15 |
| **Total Monthly** | | **$194-354** |

**One-Time:**

| Item | Cost |
|------|------|
| Smart contract deployment (mainnet) | ~0.5 SOL (~$100) |
| Development tools & services | $200 |
| **Total One-Time** | **~$300** |

### Development Time

**Timeline: 8-10 weeks with 1 full-time developer**

| Phase | Duration | Person-Days |
|-------|----------|-------------|
| Smart Contract Updates | 2 weeks | 10 days |
| Firebase & Indexer | 2 weeks | 10 days |
| API Development | 1.5 weeks | 7 days |
| Frontend Components | 2 weeks | 10 days |
| Testing & Optimization | 1.5 weeks | 7 days |
| Launch Preparation | 1 week | 5 days |
| **Total** | **10 weeks** | **49 days** |

**With 2-3 developers working in parallel:** 6-7 weeks

---

## Success Metrics

### Technical Metrics

- **Leaderboard Query Speed**: < 200ms (p95)
- **Player Profile Load**: < 500ms (p95)
- **Cache Hit Rate**: > 90%
- **API Uptime**: 99.9%
- **RPC Cost**: < $100/month
- **Firebase Cost**: < $200/month

### Product Metrics

- **Active Players**: > 1,000 within first month
- **Leaderboard Views**: > 10,000/day
- **Player Profile Views**: > 5,000/day
- **Repeat Visits**: > 40% daily active users
- **Mobile Usage**: > 30% of traffic

### Engagement Metrics

- **Competition Participation**: > 60% of players check leaderboards
- **Category Diversity**: Players compete in average 3+ categories
- **Time on Leaderboards**: Average 5+ minutes per visit
- **Social Sharing**: > 10% of top players share rankings

---

## Appendix

### Technology Stack

**Smart Contracts:**
- Rust
- Anchor Framework v0.30.1
- Solana v1.18+

**Backend:**
- Node.js 20+
- Express.js
- TypeScript
- Firebase Admin SDK
- @solana/web3.js
- @coral-xyz/anchor
- @metaplex-foundation/digital-asset-standard-api

**Frontend:**
- React 18.3.1
- TypeScript
- Three.js (game)
- Vite 7
- @solana/wallet-adapter-react

**Infrastructure:**
- Firebase Firestore (database)
- QuickNode or Helius (Solana RPC)
- AWS EC2 or DigitalOcean (indexer)
- Vercel or Netlify (frontend hosting)

### External Resources

- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [Anchor Framework Documentation](https://www.anchor-lang.com/)
- [Metaplex DAS API](https://developers.metaplex.com/das-api)
- [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore)
- [QuickNode Solana RPC](https://www.quicknode.com/docs/solana)

---

**End of Specification**

This document serves as the complete blueprint for implementing the Pirates Booty leaderboard system. All stakeholders should review and approve this specification before implementation begins.
