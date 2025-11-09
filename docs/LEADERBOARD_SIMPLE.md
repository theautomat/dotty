# Leaderboard System - Pragmatic Guide

**Version:** 1.0
**Status:** Planning
**Philosophy:** Start simple, iterate based on actual needs

> ⚠️ **Important:** This is a GUIDE, not a rigid blueprint. Adapt based on what you actually need, not what might be needed someday.

---

## Core Concept

**Goal:** Show player rankings based on game actions (treasure buried, BOOTY earned, NFTs owned, treasures found).

**Approach:** Progressive complexity - start with the simplest thing that works, then enhance.

---

## Phase 1: MVP (Start Here) 🎯

### What You Need

**6 Leaderboard Categories:**
1. **Treasure Baron** - Total value deposited
2. **BOOTY Tycoon** - Total BOOTY mined
3. **NFT Collector** - Number of NFTs owned
4. **Treasure Hunter** - Treasures claimed
5. **Explorer** - Plots visited *(requires new tracking)*
6. **Power Player** - Combined score

### Simplest Possible Implementation

**Option A: Frontend-Only (Fastest Start)**

```typescript
// Just query Solana directly from React
async function getLeaderboard(category: string) {
  // 1. Get all deposit records from program
  const deposits = await program.account.depositRecord.all();

  // 2. Group by player
  const playerStats = new Map();
  for (const deposit of deposits) {
    const player = deposit.account.player.toString();
    const current = playerStats.get(player) || { deposits: 0, totalValue: 0 };
    playerStats.set(player, {
      deposits: current.deposits + 1,
      totalValue: current.totalValue + deposit.account.amount
    });
  }

  // 3. Sort and rank
  const ranked = Array.from(playerStats.entries())
    .map(([wallet, stats]) => ({ wallet, ...stats }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .map((player, index) => ({ ...player, rank: index + 1 }));

  return ranked.slice(0, 100); // Top 100
}
```

**Pros:**
- ✅ Zero backend needed
- ✅ No database needed
- ✅ Works immediately
- ✅ Always accurate (reads from blockchain)

**Cons:**
- ❌ Slow for many players (100+ queries)
- ❌ RPC rate limits
- ❌ No caching

**When to use:** You have < 100 players, prototyping, MVP testing

---

**Option B: Firebase Cache (Recommended Start)**

```typescript
// Cache results in Firebase, refresh periodically

// Write leaderboard data (run this every 5 minutes)
async function updateLeaderboardCache() {
  const stats = await calculateLeaderboardFromSolana();

  await db.collection('leaderboards').doc('treasure_baron').set({
    players: stats,
    lastUpdated: Date.now()
  });
}

// Read from cache (instant)
async function getLeaderboard() {
  const doc = await db.collection('leaderboards').doc('treasure_baron').get();
  return doc.data().players;
}
```

**Pros:**
- ✅ Fast queries (< 100ms)
- ✅ No complex backend
- ✅ Good enough for < 1,000 players
- ✅ Firebase free tier works

**Cons:**
- ❌ Slightly stale data (5-minute delay)
- ❌ Need periodic refresh script

**When to use:** You have 100-1,000 players, need better UX

---

## Phase 2: When You Actually Need It

### Add Backend Indexer (Only If Needed)

**Signs you need this:**
- 1,000+ active players
- RPC costs > $50/month
- Users complain about stale data
- You need real-time updates

**What it does:**
- Listens to Solana transactions
- Updates Firebase automatically
- Keeps leaderboard fresh

**Don't build this until you actually need it!**

---

## Data You Can Get Right Now

### From Existing Smart Contract

**Already tracked on-chain:**

```rust
// Vault (global stats)
pub struct DepositVault {
    pub total_deposits: u64,    // Sum of all deposits
    pub total_claims: u64,      // Sum of all claims
}

// Per-player deposit
pub struct DepositRecord {
    pub player: Pubkey,         // Who made deposit
    pub amount: u64,            // How much
    pub timestamp: i64,         // When
    pub tier: u8,               // Tier 1-4
    pub claimed: bool,          // Has been claimed?
}

// BOOTY state
pub struct BootyState {
    pub total_mined: u64,       // Global BOOTY mined
    pub total_burned: u64,      // Global BOOTY burned
}
```

**What you can calculate:**

| Metric | How to Get It |
|--------|---------------|
| Treasures buried per player | Count `DepositRecord` by player |
| Total value deposited per player | Sum `amount` in `DepositRecord` by player |
| Treasures dug per player | Count `DepositRecord` where `claimed = true` by claimer |
| NFTs owned | Query Metaplex (off-chain) |
| BOOTY balance | Query SPL token account (off-chain) |

**What you CAN'T get (need smart contract update):**

- ❌ BOOTY mined per player *(only global total exists)*
- ❌ BOOTY burned per player *(only global total exists)*
- ❌ Plots visited *(not tracked at all)*

---

## Smart Contract Enhancements

### Do You Need PlayerStats PDA?

**Current approach:** Query all `DepositRecord` and aggregate client-side

**Alternative approach:** Add `PlayerStats` PDA to track per-player totals

**Decision matrix:**

| Players | Current Approach | PlayerStats PDA |
|---------|------------------|-----------------|
| < 100 | ✅ Works fine | ❌ Overkill |
| 100-500 | ⚠️ Slow but OK | ✅ Better UX |
| 500+ | ❌ Too slow | ✅ Necessary |

**Recommendation:** Wait until you have 100+ players, then add PlayerStats

---

## Leaderboard Categories (Simple Version)

### 1. Treasure Baron 🏴‍☠️
- **Metric:** Sum of all `DepositRecord.amount` per player
- **Query:** `program.account.depositRecord.all()`, group by player
- **Complexity:** Easy ✅

### 2. BOOTY Tycoon 💰
- **Metric:** Current BOOTY token balance
- **Query:** `getAccount(playerBootyTokenAccount)`
- **Complexity:** Easy ✅
- **Note:** This is *current* balance, not *total mined* (which requires contract update)

### 3. NFT Collector 🎨
- **Metric:** Count of NFTs owned (weighted by tier)
- **Query:** Metaplex DAS API `getAssetsByOwner()`
- **Complexity:** Medium (need RPC with DAS support)

### 4. Treasure Hunter 🔍
- **Metric:** Count of `DepositRecord` where `claimed = true` by this player
- **Query:** Parse transaction history for `claim_deposit` instructions
- **Complexity:** Hard ⚠️ (need to parse tx history)
- **Alternative:** Add `claimer` field to `DepositRecord` in smart contract

### 5. Explorer 🗺️
- **Metric:** Unique plots visited
- **Query:** N/A - not currently tracked
- **Complexity:** Requires smart contract update ❌

### 6. Power Player 👑
- **Metric:** Weighted average of other categories
- **Query:** Combine scores from other categories
- **Complexity:** Easy (once others work)

---

## Frontend Components

### Reuse MetadataPanel Pattern

You already have a great panel component! Copy that pattern:

```typescript
// LeaderboardPanel.tsx (copy MetadataPanel structure)
interface LeaderboardPanelProps {
  category: string;
  period?: 'daily' | 'weekly' | 'all_time';
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({ category }) => {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    loadLeaderboard(category).then(setPlayers);
  }, [category]);

  return (
    <div className="panel">
      <h2>{categoryName}</h2>
      <table>
        {players.map(player => (
          <tr key={player.wallet}>
            <td>{player.rank}</td>
            <td>{player.wallet.slice(0, 8)}...</td>
            <td>{player.score}</td>
          </tr>
        ))}
      </table>
    </div>
  );
};
```

---

## What NOT to Build (Yet)

❌ **Data indexer service** - Just query Solana directly
❌ **REST API** - Call Firebase from frontend
❌ **WebSocket real-time updates** - Refresh every 30 seconds is fine
❌ **Background job scheduler** - Use Vercel Cron or manual trigger
❌ **Complex caching strategy** - Firebase cache with TTL is enough
❌ **Player profile pages** - Start with leaderboard only
❌ **Time-based periods (daily/weekly)** - All-time only for MVP

---

## Recommended MVP Timeline

### Week 1: Proof of Concept
- [ ] Create simple frontend component
- [ ] Query Solana for deposit records
- [ ] Calculate Treasure Baron rankings
- [ ] Display in a table

### Week 2: Add Caching
- [ ] Set up Firebase
- [ ] Write script to cache leaderboard
- [ ] Update frontend to read from cache
- [ ] Deploy to Vercel

### Week 3: Add Categories
- [ ] BOOTY Tycoon (token balance query)
- [ ] NFT Collector (Metaplex query)
- [ ] Add category selector UI

### Week 4: Polish
- [ ] Mobile responsive
- [ ] Loading states
- [ ] Error handling
- [ ] Deploy to production

**Total: 4 weeks, not 10 weeks!**

---

## Evolution Path

**Start:** Frontend-only queries
↓
**Outgrew it?** Add Firebase cache
↓
**Outgrew it?** Add periodic refresh script
↓
**Outgrew it?** Add backend indexer
↓
**Outgrew it?** Add PlayerStats PDA to smart contract

**Don't jump to the end!** Each step solves real problems you're actually experiencing.

---

## Key Principles

1. **Start with the simplest thing that works**
2. **Only add complexity when you feel the pain**
3. **This is a GUIDE, not a BLUEPRINT**
4. **Copy patterns from existing code (MetadataPanel, Map, etc.)**
5. **Ship fast, iterate based on feedback**

---

## When to Refer to Full Spec (LEADERBOARD.md)

The detailed LEADERBOARD.md doc has value for:

- Understanding long-term architecture options
- Technical implementation details
- Cost estimates for scaling
- Code examples for specific features

**But treat it as a reference library, not a step-by-step manual.**

---

## Questions to Ask Before Building Something

1. **Do I need this right now?** (Not "might I need this someday")
2. **Can I solve this with existing tools?** (Don't build what you can buy/use)
3. **What's the simplest version?** (MVP > perfect)
4. **Can I reuse existing patterns?** (MetadataPanel, Map, mockPlotData)

---

**Remember:** The best code is no code. The second-best code is simple code that works.

Ship the leaderboard that gets you to 100 players, then worry about scaling to 10,000.
