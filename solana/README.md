# Dotty NFT Solana Program

This folder contains the Solana smart contract (program) for minting collectible NFTs in the Dotty game.

## Overview

When players discover treasures in the Dotty game, they can claim NFTs that are minted directly to their Phantom wallet. This uses:

- **Anchor Framework** - Rust framework for building Solana programs
- **Metaplex Token Metadata** - Industry standard for Solana NFTs
- **Backend-Signed Minting** - Game server validates claims and signs transactions

## How It Works

1. Player finds a collectible in the game
2. Game backend receives claim request with player's wallet address
3. Backend validates the claim (rate limiting, anti-cheat, etc.)
4. Backend calls the Solana program to mint an NFT to player's wallet
5. NFT appears in player's Phantom wallet with metadata and image

## Project Structure

```
solana/
├── Anchor.toml              # Anchor configuration
├── programs/
│   └── dotty-nft/
│       ├── Cargo.toml       # Rust dependencies
│       ├── Xargo.toml       # Cross-compilation config
│       └── src/
│           └── lib.rs       # Main smart contract code
├── metadata/                # NFT metadata JSON files
│   └── examples/            # Example metadata for different collectibles
└── tests/                   # Test files (TODO)
```

## Setup & Installation

### Prerequisites

1. **Install Rust**:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. **Install Solana CLI**:
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

3. **Install Anchor**:
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

4. **Configure Solana CLI for Devnet**:
```bash
solana config set --url https://api.devnet.solana.com
```

5. **Create a wallet** (if you don't have one):
```bash
solana-keygen new
```

### Building the Program

```bash
cd solana
anchor build
```

### Testing Locally

```bash
anchor test
```

### Deploying to Devnet

```bash
anchor deploy
```

This will output a Program ID. Update the `declare_id!()` in `src/lib.rs` and the program ID in `Anchor.toml` with this value.

## Program Functions

### `mint_collectible`

Mints a new collectible NFT to a player's wallet.

**Parameters:**
- `metadata_title: String` - Name of the NFT (e.g., "Golden Asteroid Fragment")
- `metadata_symbol: String` - Symbol (e.g., "DOTTY")
- `metadata_uri: String` - URL to JSON metadata (image, attributes, etc.)

**Accounts Required:**
- `player` - The player's wallet that receives the NFT
- `payer` - Game backend wallet that pays gas and authorizes mint
- `mint` - New mint account (created by this transaction)
- `token_account` - Player's token account (created if needed)
- `metadata` - Metaplex metadata account

## NFT Metadata Format

Each NFT needs a JSON file hosted somewhere (IPFS, Arweave, or regular web hosting):

```json
{
  "name": "Golden Asteroid Fragment",
  "symbol": "DOTTY",
  "description": "A rare golden fragment discovered in the depths of space.",
  "image": "https://example.com/images/golden-fragment.png",
  "attributes": [
    {
      "trait_type": "Rarity",
      "value": "Legendary"
    },
    {
      "trait_type": "Type",
      "value": "Asteroid Fragment"
    }
  ]
}
```

## Security Considerations

⚠️ **Current Implementation:**
- Backend wallet controls all minting
- Basic rate limiting should be added
- No on-chain validation of gameplay

🔒 **Future Improvements:**
- Add session verification
- Implement cooldowns in smart contract
- Add signature verification for claims
- Track minted collectibles on-chain to prevent duplicates

## Development Workflow

1. Make changes to `src/lib.rs`
2. Build: `anchor build`
3. Test: `anchor test`
4. Deploy to devnet: `anchor deploy`
5. Update backend with new Program ID
6. Test in game

## Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Metaplex Docs](https://docs.metaplex.com/)
- [Phantom Wallet](https://phantom.com/)
