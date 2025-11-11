# Treasure Search Architecture - Proposed Solutions

**Status**: 🚧 DESIGN PHASE - No solution has been selected yet

**Date**: 2025-11-11

**Purpose**: This document captures all proposed architectural solutions for implementing blind treasure searches in the Dotty game. These are exploratory ideas documented for future decision-making.

---

## Problem Statement

### The Core Paradox

We need to implement a treasure search system with these seemingly contradictory requirements:

1. **Blind Search with Risk**: Players must pay a search fee WITHOUT knowing if treasure exists at that location
2. **Hidden Locations**: Treasure coordinates must remain secret until searched (can't peek on block explorer)
3. **Verifiable Release**: Once searched, treasure MUST be provably released - no server failures or cheating
4. **No Front-Running**: Prevent others from seeing a search transaction and claiming the treasure first
5. **Multiple Treasures**: Support 0 to N treasures at a single location (could be different token types)
6. **Instant Gratification**: Player should see results immediately after paying search fee

### Game Mechanic (Pirate Theme)

Think of this like sailing a ship across the ocean to search an island:
- **High risk**: You spend resources (gas + search fee) to travel there
- **Uncertain reward**: Island might have treasure, might be empty
- **No backing out**: Once you commit to the journey, you can't reverse it
- **Surprise element**: You don't know what you'll find until you arrive

### Current System (What We Have)

- Treasure hiding works via `hide_treasure` Solana instruction
- Treasures stored in individual PDAs with depositor signature
- Firebase indexes treasure deposits for display/analytics
- X,Y coordinates currently stored in plain text (will need encryption later)

---

## Solution 1: Commitment Scheme (Hash + Reveal)

### How It Works

1. **Hiding Treasure**:
   - When hiding at (X=5, Y=10), compute: `treasure_hash = hash(X, Y, salt, depositor)`
   - Store treasure tokens in vault with this hash as identifier
   - Store hash on-chain, actual coordinates off-chain or encrypted

2. **Searching**:
   - User submits: `search(x=5, y=10)` transaction + search fee
   - Program iterates through ALL treasure hashes
   - For each treasure: computes `hash(5, 10, salt, depositor)` and compares
   - If match found, releases treasure immediately in same transaction
   - If no match, search fee is collected (user gets nothing)

### Advantages

✅ Truly blind - can't see treasure locations on explorer
✅ Single transaction (search + claim in one)
✅ No server dependencies
✅ Cryptographically secure

### Disadvantages

❌ **Gas expensive** - Must iterate through potentially thousands of hashes per search
❌ **Scalability issues** - More treasures = higher gas costs
❌ **Complex salt management** - Need secure salt generation and storage
❌ **All or nothing** - Can't optimize for "hot spots" with many treasures

### Implementation Complexity

**High** - Requires careful hash collision handling, salt management, and gas optimization

---

## Solution 2: PDA Per Square (Treasure Chest Model)

### How It Works

1. **Deterministic Chest Addresses**:
   - Each map square has a PDA: `seeds=[b"chest", x.to_le_bytes(), y.to_le_bytes()]`
   - Chest is created when first treasure is hidden there
   - Chest can hold multiple token accounts (different SPL tokens)

2. **Hiding Treasure**:
   - User transfers tokens INTO the chest PDA for that square
   - Chest accumulates all treasures hidden at that location
   - Multiple people can add to the same chest

3. **Searching**:
   - User pays search fee + transaction to claim chest at (X, Y)
   - Program transfers entire chest ownership to searcher
   - Chest might be empty (user loses fee) or full (user wins tokens)
   - First searcher gets everything

### Advantages

✅ **Simple and deterministic** - Easy to implement and understand
✅ **Instant verification** - Single transaction, immediate result
✅ **No indexer needed** - Fully on-chain logic
✅ **Gas efficient** - No iteration, direct PDA lookup
✅ **Supports multiple token types** - Chest can have many token accounts

### Disadvantages

❌ **Transparency issue** - Anyone can query chest balance before searching
❌ **One-time search** - After first search, chest is empty (need reset mechanism)
❌ **No granularity** - Can't hide individual treasures, only accumulate in chest

### Transparency Mitigation

**Potential Fix**: Could make chest account data opaque by:
- Storing token accounts in separate PDAs derived from chest
- Only revealing balances after ownership transfer
- Using encrypted state (complex, may not be practical)

### Implementation Complexity

**Low** - Straightforward PDA pattern, simple token transfers

---

## Solution 3: Encrypted Treasure Vaults with Time-Lock

### How It Works

1. **Central Vault**:
   - Single program-owned vault holds ALL treasure tokens
   - Vault has authority to transfer tokens

2. **Hiding Treasure (Encrypted)**:
   - Create encrypted treasure record: `encrypt(x, y, amount, tokenMint, searcherPubkey=null)`
   - Store encrypted record on-chain or in separate data account
   - Tokens sit in central vault

3. **Searching (Two-Phase)**:
   - **Phase 1 - Search Transaction**:
     - User pays search fee
     - User pubkey gets recorded in "active search" state
     - 10-minute time lock starts

   - **Phase 2 - Indexer Callback**:
     - Off-chain indexer (Helius) detects search transaction
     - Indexer decrypts matching treasures for (X, Y)
     - Indexer calls program to release tokens from vault to searcher
     - Treasure records marked as claimed

4. **Fallback Mechanism**:
   - If indexer fails to respond within 10 minutes
   - User can call "emergency withdraw" to get refund of search fee
   - Treasure remains unclaimed (can be manually recovered later)

### Advantages

✅ **True privacy** - Coordinates remain encrypted until search
✅ **Scalable** - Unlimited treasures per location
✅ **Indexer failure protection** - Emergency withdraw as fallback
✅ **Supports complex rules** - Can add conditions in indexer logic

### Disadvantages

❌ **Server dependency** - Relies on indexer being online
❌ **Delayed gratification** - User must wait for indexer callback (seconds to minutes)
❌ **Complex encryption** - Key management, decryption logic
❌ **Attack surface** - Indexer could be compromised or DDoS'd
❌ **Extra transactions** - Emergency withdraw adds complexity

### Implementation Complexity

**Very High** - Encryption, indexer service, time-locks, fallback mechanisms

---

## Solution 4: Two-Transaction Blind Auction Style

### How It Works

1. **Transaction 1 - Commit (Search)**:
   - User computes: `commitment_hash = hash(x, y, nonce)`
   - User submits: `search_commit(commitment_hash)` + search fee
   - Program locks search for 30 seconds
   - Nonce is kept secret by user

2. **Transaction 2 - Reveal (Claim)**:
   - Within 30 seconds, user submits: `search_reveal(x, y, nonce)`
   - Program validates: `hash(x, y, nonce) == commitment_hash`
   - Program checks if treasure exists at (X, Y)
   - If treasure exists, transfers tokens to user
   - If no treasure, search fee already collected

3. **Timeout Mechanism**:
   - If user doesn't reveal within 30 seconds, search fee is forfeit
   - Prevents indefinite locking of search state

### Advantages

✅ **Prevents front-running** - Commitment hides target until reveal
✅ **No indexer needed** - Fully on-chain logic
✅ **True blind search** - Can't see what you're searching for beforehand
✅ **Secure nonce** - User controls their own randomness

### Disadvantages

❌ **Two transactions required** - More expensive, more complex UX
❌ **30-second wait time** - User must wait between commit and reveal
❌ **Coordination lookup needed** - Still need to map (X,Y) to treasure accounts
❌ **User error risk** - Could forget nonce or miss 30-second window

### Implementation Complexity

**Medium-High** - Commit-reveal pattern, timeout logic, nonce management

---

## Solution 5: Zero-Knowledge Proofs (ZK-SNARKs)

### How It Works

1. **Treasure Commitment**:
   - When hiding, create zero-knowledge proof of treasure at (X, Y)
   - Store proof on-chain (small size, ~200 bytes)
   - Actual coordinates remain cryptographically hidden

2. **Search Verification**:
   - User generates proof: "I am searching coordinate (X, Y)"
   - User submits proof + search fee to program
   - Program verifies proof against treasure commitments
   - If proof validates, releases treasure in same transaction

3. **Privacy Guarantee**:
   - Coordinates never revealed on-chain
   - Proofs are zero-knowledge (can't extract X,Y from them)
   - Only valid searcher can claim matching treasure

### Advantages

✅ **True cryptographic privacy** - Coordinates mathematically hidden
✅ **Single transaction** - Prove and claim in one step
✅ **No server needed** - Fully on-chain verification
✅ **Elegant solution** - Solves privacy problem at fundamental level

### Disadvantages

❌ **Extremely complex** - Requires ZK circuit design and implementation
❌ **Limited Solana support** - ZK verification on Solana is experimental
❌ **Browser compatibility** - Generating proofs in browser may be slow
❌ **Proving time** - Could take seconds to generate proof (bad UX)
❌ **Circuit updates difficult** - Hard to change logic once deployed

### Implementation Complexity

**Extremely High** - Requires ZK expertise, may not be practical for MVP

---

## Solution 6: Modified Treasure Chest (Decoy + Hidden)

**Hybrid Approach Combining PDA Chest with Privacy**

### How It Works

1. **Two-Layer Chest System**:
   - Each square has a visible "decoy" chest PDA
   - Each square also has a hidden "real" chest PDA (derived with secret seed)

2. **Hiding Treasure**:
   - Randomly decide: put treasure in decoy (30% chance) or hidden (70% chance)
   - Sometimes put small amount in decoy, rest in hidden
   - User can't predict which chest has the real treasure

3. **Searching**:
   - User searches square at (X, Y)
   - Program transfers BOTH chests to user (decoy + hidden)
   - User doesn't know beforehand which chest has value

4. **Privacy Through Obscurity**:
   - Block explorers can see decoy chest balance
   - Hidden chest PDA not easily discoverable (non-standard derivation)
   - Creates uncertainty about actual treasure amount

### Advantages

✅ **Mystery element** - User can see decoy but not hidden chest
✅ **Simple to implement** - Just two PDAs instead of one
✅ **Gas efficient** - Direct lookups, no iteration
✅ **Psychological factor** - Visible decoy creates false security

### Disadvantages

❌ **Security through obscurity** - Not cryptographically secure
❌ **Eventually discoverable** - Dedicated attacker could find hidden PDA pattern
❌ **Still one-time search** - After first search, chests are empty
❌ **Extra chest management** - More accounts to track

### Implementation Complexity

**Low-Medium** - Slightly more complex than basic chest, but still straightforward

---

## Comparison Matrix

| Solution | Privacy | Gas Cost | Complexity | Server Needed | Scalability | User Flow | Front-Run Risk |
|----------|---------|----------|------------|---------------|-------------|-----------|----------------|
| **Hash Commitment** | ⭐⭐⭐⭐⭐ | ❌ High | ⭐⭐⭐⭐ | ❌ No | ⭐⭐ Limited | 1 TX | ✅ Low |
| **PDA Chest** | ⭐ Low | ✅ Low | ✅ Simple | ❌ No | ⭐⭐⭐⭐ Good | 1 TX | ⭐⭐⭐ Medium |
| **Encrypted Vault** | ⭐⭐⭐⭐⭐ | ✅ Low | ⭐⭐⭐⭐⭐ | ⚠️ Yes | ⭐⭐⭐⭐⭐ | 1 TX + wait | ✅ Low |
| **Commit-Reveal** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ No | ⭐⭐⭐ Good | 2 TX | ✅ Low |
| **Zero-Knowledge** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ No | ⭐⭐⭐⭐ | 1 TX | ✅ Low |
| **Decoy Chest** | ⭐⭐ Medium | ✅ Low | ⭐⭐ Easy | ❌ No | ⭐⭐⭐⭐ Good | 1 TX | ⭐⭐ Medium |

**Legend**:
- ⭐ = Better (more stars = better for that metric)
- ❌ = Not required
- ⚠️ = Required but has fallback
- ✅ = Advantage

---

## Open Questions & Research Needed

### Technical Questions

1. **Solana Account Limits**:
   - What's the maximum number of token accounts a single PDA can own?
   - What's the practical limit before gas costs become prohibitive?

2. **PDA Derivation**:
   - Can we create "hidden" PDAs that aren't easily discoverable?
   - What seed patterns would make PDAs non-obvious?

3. **Token Transfer Batching**:
   - Can we transfer multiple token types in a single transaction?
   - What's the limit before hitting transaction size limits?

4. **State Compression**:
   - Could we use Solana state compression for treasure metadata?
   - Would this help with scalability?

### Game Design Questions

1. **Search Fee Economics**:
   - What should search fee cost? (Fixed SOL? Dynamic based on treasures?)
   - Who gets the search fee? (Burn? Treasury? Previous hider?)

2. **Chest Reset Mechanism**:
   - After someone searches a square, how do we reset it?
   - Auto-reset after time period? Manual reset? New chest created?

3. **Multiple Searchers**:
   - What happens if two people search same square at same time?
   - First transaction wins? Split treasure? Both pay fee?

4. **Treasure Density**:
   - Should there be limits on treasures per square?
   - Game balance: too many treasures = always profitable to search?

### Security Questions

1. **Front-Running Protection**:
   - Can MEV bots see search transactions and front-run?
   - Do we need commit-reveal even with on-chain logic?

2. **Griefing Attacks**:
   - Can someone hide worthless tokens to spam the system?
   - Minimum treasure value? Deposit requirements?

3. **Coordinate Encryption**:
   - When do we need to encrypt coordinates?
   - What encryption scheme works with Solana programs?

---

## Recommendation Path Forward

### Phase 1: Prototype (Choose Simplest)

Start with **Solution 2 (PDA Chest)** or **Solution 6 (Decoy Chest)** for MVP:
- Fastest to implement
- Lowest gas costs
- Good enough for initial testing
- Can migrate to more sophisticated solution later

### Phase 2: Research

While building MVP, research:
- Commit-reveal patterns on Solana
- State compression for treasure metadata
- ZK-proof libraries compatible with Solana
- Encrypted state techniques

### Phase 3: Production

Based on research and MVP learnings, choose final solution:
- If privacy critical: Hash Commitment or ZK-Proofs
- If server acceptable: Encrypted Vault with time-lock
- If simple preferred: Enhanced PDA Chest with optimizations

---

## Next Steps

1. **Make architectural decision** - Choose which solution to implement
2. **Write detailed spec** - Define exact data structures and instruction handlers
3. **Create test plan** - How do we validate blind search works correctly?
4. **Estimate gas costs** - Model costs for different treasure densities
5. **Design UI/UX** - How does search button work? What modals show?
6. **Plan migration path** - How do we upgrade if we want to change approaches later?

---

## References

- [Solana PDA Documentation](https://docs.solana.com/developing/programming-model/calling-between-programs#program-derived-addresses)
- [Commit-Reveal Schemes](https://en.wikipedia.org/wiki/Commitment_scheme)
- [Zero-Knowledge Proofs on Solana](https://docs.solana.com/developing/on-chain-programs/examples#zero-knowledge-proofs)
- [Helius Webhooks](https://docs.helius.dev/webhooks-and-websockets/webhooks)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-11
**Status**: Open for discussion and decision
