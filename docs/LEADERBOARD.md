# Leaderboard System

**Status:** Planning / Not Yet Implemented

---

## What Exists Now

**Nothing yet** - the leaderboard system hasn't been built.

---

## Current Game State (What We Can Track)

### On-Chain Data Available

From the Solana smart contract, we can query:

**Deposit Records:**
- Player wallet address
- Amount deposited
- Timestamp
- Tier (1-4)
- Claimed status

**BOOTY Token:**
- Total mined (global)
- Total burned (global)
- Current balance per player (via SPL token query)

**NFTs:**
- NFTs owned by each player (via Metaplex)

---

## Proposed Leaderboard Categories

### 1. Treasure Baron
**Metric:** Total value of treasure deposited by a player

### 2. BOOTY Tycoon
**Metric:** Current BOOTY token balance

### 3. NFT Collector
**Metric:** Number of NFTs owned (weighted by tier)

### 4. Treasure Hunter
**Metric:** Number of treasures claimed

### 5. Explorer
**Metric:** Unique plots visited
**Note:** Requires adding plot visit tracking to smart contract

### 6. Power Player
**Metric:** Combined score across all categories

---

## Simple Implementation Plan

### Phase 1: Frontend Query
- Query Solana program directly from React
- Calculate rankings client-side
- Display in a table

### Phase 2: Add Caching (If Needed)
- Cache results in Firebase
- Refresh periodically
- Faster queries for users

### Phase 3: Smart Contract Updates (If Needed)
- Add PlayerStats PDA to track per-player totals
- Only necessary when we have 100+ players

---

## What We're NOT Building (Yet)

- Backend indexer service
- Real-time WebSocket updates
- Complex caching strategies
- Separate API layer
- Time-based periods (daily/weekly)

**Philosophy:** Start simple. Add complexity only when needed.

---

## Next Steps

1. Build basic leaderboard component (reuse MetadataPanel pattern)
2. Query Solana for deposit records
3. Calculate and display Treasure Baron rankings
4. Ship it and see what players actually want

---

For detailed technical implementation options, see [LEADERBOARD_SIMPLE.md](./LEADERBOARD_SIMPLE.md)
