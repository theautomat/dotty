# Pirates Booty - Gameplay Guide

## Overview

Pirates Booty is a blockchain-based treasure hunting game built on Solana where players navigate a vast pirate map, hide meme coin treasures, and compete to discover hidden booty. The game combines exploration, strategy, and cryptocurrency mechanics to create an engaging treasure hunting adventure.

## Core Game Mechanics

### The Map

Navigate a massive **100 × 100 grid map** containing 10,000 possible locations where treasure can be hidden. Each grid cell represents a potential treasure location on the high seas.

**Movement Controls:**
- **W** - Move North
- **A** - Move West
- **S** - Move South
- **D** - Move East

Your current position is highlighted on the map, and the camera smoothly follows your ship as you navigate the seas.

## The $BOOTY Token

$BOOTY is the native token that powers the Pirates Booty economy. It serves two critical functions:

### 🪙 Earning $BOOTY (Mining)

**Mine $BOOTY tokens by hiding treasure.** When you bury meme coins as treasure, you automatically mint $BOOTY tokens as a reward for contributing to the game.

### 🔥 Spending $BOOTY (Burning)

**Burn $BOOTY tokens to travel the map.** Moving your ship to explore different grid locations costs $BOOTY tokens. The more you explore, the more tokens you burn - but you might discover hidden treasure!

This creates a balanced economy where:
- Hiding treasure → Earn $BOOTY
- Traveling to find treasure → Burn $BOOTY

## Hiding Treasure

### How to Hide Treasure

1. **Connect your Solana wallet** (Phantom recommended)
2. **Select a meme coin token** to hide (PEPE, BONK, WIF, USDC, or SOL)
3. **Choose an amount** (minimum 100 tokens)
4. **Pick a secret grid location** to hide your treasure
5. **Approve the transaction** in your wallet

Your tokens are transferred to the game's treasure vault and stored on-chain in a treasure record. Other players can now hunt for your hidden booty!

### Treasure Tiers

The amount you hide determines your treasure's **tier level**, which unlocks special NFT rewards:

| Tier | Amount | NFT Reward | Rarity |
|------|--------|------------|---------|
| 🥉 **Tier 1** | 100 - 999 tokens | Golden Chest | Common |
| 🥈 **Tier 2** | 1,000 - 9,999 tokens | Jewel Trove | Rare |
| 🥇 **Tier 3** | 10,000 - 99,999 tokens | Ancient Map | Epic |
| 💎 **Tier 4** | 100,000+ tokens | Legendary Booty | Legendary |

Higher tier treasures yield rarer NFT collectibles when claimed!

### Treasure Guardians

Each hidden treasure is protected by a mystical guardian:

- 🐉 **Dragon** - Fierce and powerful
- 👺 **Goblin** - Cunning and tricky
- 🔥 **Phoenix** - Rising from the ashes
- 🦑 **Kraken** - Terror of the deep
- 🦄 **Unicorn** - Magical and rare

## Finding Treasure

### The Hunt

To discover treasure, navigate your ship across the map using WASD controls. When you travel to a grid location:

1. **Burn $BOOTY tokens** to move to that position
2. **Automatically check** if treasure is hidden there
3. **Claim the treasure** if found - it's immediately transferred to your wallet!

The challenge is finding the secret locations where other players have hidden their treasure. Use strategy, follow clues, and explore the vast seas!

### Claiming Rewards

When you successfully find treasure:
- ✅ The hidden tokens are **transferred to your wallet**
- ✅ The treasure is **marked as claimed** on-chain
- ✅ You can **mint the tier NFT** corresponding to the treasure amount
- ✅ Your discovery is **recorded** in the game's history

## NFT Collectibles

Pirates Booty features two types of collectibles:

### 🎁 Free Collectibles

Discover these collectibles during your adventures:
- 🐙 **Octopus** - Tentacled terror
- 🏴‍☠️ **Scallywag** - Untrustworthy sailor
- ⛵ **Boat** - Your trusty vessel
- 👗 **Wench** - Tavern companion

### 💰 Premium NFTs (Treasure Rewards)

Earn these exclusive NFTs by hiding or claiming treasure:
- **Golden Chest** (Tier 1) - Common chest of gold
- **Jewel Trove** (Tier 2) - Rare precious gems
- **Ancient Map** (Tier 3) - Epic treasure map
- **Legendary Booty** (Tier 4) - Legendary ultimate prize

Each NFT is minted on Solana using the Metaplex standard with unique metadata and artwork.

## The Treasure Vault

All hidden treasure is securely stored in the game's **on-chain vault**. The vault is a Solana program account that:

- 🔒 **Holds all deposited tokens** safely on the blockchain
- 📊 **Tracks total hidden amount** across all players
- 📈 **Records total claims** and treasure discoveries
- ✅ **Validates token types** against a whitelist

Only the smart contract can move tokens from the vault - ensuring fair gameplay and security.

## Smart Contract Architecture

Pirates Booty runs on Solana with a fully on-chain game program:

**Program ID:** `7fcqEt6ieMEgPNQUbVyxGCpVXFPfRsj7xxHgdwqNB1kh`

### Key Instructions

- **`mint_nft`** - Mint collectible NFTs to your wallet
- **`hide_treasure`** - Deposit tokens and create treasure record
- **`claim_treasure`** - Claim found treasure and mark as discovered
- **`mine_booty`** - Mint $BOOTY tokens when hiding treasure
- **`burn_booty_for_travel`** - Burn $BOOTY to move on the map
- **`initialize_vault`** - Admin setup of treasure vault
- **`whitelist_token`** - Admin adds supported token types

All game actions are recorded on the Solana blockchain, ensuring transparency and immutability.

## Token Economics

### Supply Mechanics

- **Total Mined:** Cumulative $BOOTY earned by all players hiding treasure
- **Total Burned:** Cumulative $BOOTY spent on travel by all players
- **Net Supply:** Total Mined - Total Burned
- **Max Supply:** Optional cap to control inflation

The tokenomics create a balanced loop:
1. Players hide treasure → $BOOTY minted
2. Players explore map → $BOOTY burned
3. Supply expands as treasure is added
4. Supply contracts as exploration increases

### Strategic Considerations

- **Hide more treasure** to earn more $BOOTY
- **Explore efficiently** to minimize burn rate
- **Follow patterns** from other players' activities
- **Time your moves** based on treasure density

## Blockchain Integration

### Real-Time Monitoring

Pirates Booty uses **Helius webhooks** to monitor the Solana blockchain in real-time:

1. Player hides treasure on-chain
2. Helius detects the new treasure record account
3. Webhook sends transaction data to the backend
4. Firebase stores treasure metadata
5. Frontend displays active treasures to all players

### Data Storage

**On-Chain (Solana):**
- Treasure records (amount, player, timestamp, claimed status)
- $BOOTY state (total mined/burned)
- Vault configuration
- NFT mints and metadata

**Off-Chain (Firebase):**
- Treasure locations (grid coordinates)
- Player usernames and profiles
- Transaction signatures
- Claim history and leaderboards

## Game Strategy

### For Treasure Hiders

- **Hide in unexpected locations** to avoid early discovery
- **Use higher amounts** to earn rarer NFT tiers
- **Spread treasures across the map** to maximize mining rewards
- **Track the grid** to see high-traffic vs. unexplored areas

### For Treasure Hunters

- **Burn tokens efficiently** by exploring strategically
- **Look for patterns** in treasure placement
- **Target high-value areas** based on player activity
- **Claim quickly** when you find treasure

### Economic Balance

Finding the right balance between hiding and hunting:
- Hide too much → Earn $BOOTY but don't discover treasure
- Hunt too much → Burn $BOOTY without finding anything
- **Optimal strategy:** Hide treasure to fund exploration, then use earned $BOOTY to hunt

## Getting Started

1. **Get a Solana wallet** (Phantom, Backpack, or Solflare)
2. **Add SOL** to your wallet for transaction fees
3. **Get some meme coins** (BONK, WIF, PEPE) to hide as treasure
4. **Visit the game** and connect your wallet
5. **Hide your first treasure** to earn $BOOTY
6. **Start exploring** the map to hunt for hidden booty!

## Technical Details

### Grid System
- **Grid Size:** 100 × 100 cells
- **Total Locations:** 10,000 possible treasure spots
- **Coordinate System:** X (0-99), Y (0-99)
- **World Scale:** 1,000 Three.js units
- **Cell Size:** 10 units per cell

### Token Standards
- **$BOOTY:** SPL Token with 9 decimals
- **NFTs:** Metaplex Token Metadata Standard
- **Treasure Tokens:** Whitelisted SPL tokens

### Minimum Requirements
- **Minimum Hide Amount:** 100 tokens
- **Wallet:** Solana-compatible wallet required
- **Browser:** Modern browser with WebGL support
- **Connection:** Internet connection for blockchain interaction

## Game Status

### ✅ Fully Implemented Features

- WASD grid navigation system
- Treasure hiding with automatic tier calculation
- $BOOTY token minting and burning
- NFT minting (free collectibles and tier rewards)
- On-chain treasure vault
- Real-time blockchain monitoring via Helius
- Firebase backend for treasure tracking
- Wallet integration (Phantom, Backpack, Solflare)

### 🚧 Roadmap

Future enhancements planned:
- Automatic treasure discovery when traveling to hidden locations
- Player leaderboards and statistics
- Multiplayer real-time visualization
- Plot ownership and territory control
- NFT multiplier bonuses for gameplay advantages
- Special events and limited-time treasure hunts

---

## Join the Hunt

The seas are vast, the treasure is real, and the booty awaits! Connect your wallet and start your pirate adventure today.

**Remember:** Every treasure you hide helps the economy. Every location you explore brings you closer to riches. The blockchain never forgets, and neither do pirates.

Fair winds and following seas! 🏴‍☠️⚓🗺️
