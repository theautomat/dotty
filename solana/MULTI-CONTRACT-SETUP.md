# Multi-Contract Setup Guide

Complete guide for working with multiple Solana programs in the Dotty project.

## Overview

The Dotty project now supports **multiple Solana programs** in a unified workspace:

1. **dotty-nft** - NFT minting for collectibles
2. **treasure-deposit** - Deposit memecoins → receive monster NFTs

## Project Structure

```
solana/
├── programs/
│   ├── dotty-nft/              # NFT minting program
│   │   ├── src/lib.rs
│   │   ├── Cargo.toml
│   │   └── Xargo.toml
│   └── treasure-deposit/       # Memecoin deposit program
│       ├── src/lib.rs
│       ├── Cargo.toml
│       └── Xargo.toml
├── tests/
│   ├── dotty-nft.ts           # NFT tests
│   └── treasure-deposit.ts    # Deposit tests
├── Anchor.toml                 # Multi-program configuration
├── CONTRACTS-GUIDE.md          # Beginner's guide to Solana
├── README.md                   # Main documentation
└── tasks.md                    # Development roadmap
```

## Building Programs

### Build All Programs
```bash
cd solana
anchor build
```

This compiles both programs and generates:
- `target/deploy/dotty_nft.so`
- `target/deploy/treasure_deposit.so`
- `target/idl/dotty_nft.json`
- `target/idl/treasure_deposit.json`
- TypeScript types in `target/types/`

### Build Specific Program
```bash
anchor build --program-name dotty-nft
anchor build --program-name treasure-deposit
```

## Testing

### Run All Tests
```bash
# From root
npm run test:solana

# From solana directory
anchor test
```

### Run Specific Test File
```bash
anchor test --skip-deploy tests/dotty-nft.ts
anchor test --skip-deploy tests/treasure-deposit.ts
```

### Test Against Devnet
```bash
npm run test:solana:devnet
```

## Deployment

### Deploy Both Programs
```bash
cd solana
anchor deploy --provider.cluster devnet
```

### Deploy Specific Program
```bash
anchor deploy --program-name dotty-nft --provider.cluster devnet
anchor deploy --program-name treasure-deposit --provider.cluster devnet
```

### After Deployment

Update program IDs in **three** locations:

1. **programs/*/src/lib.rs**
```rust
// programs/dotty-nft/src/lib.rs
declare_id!("YOUR_DOTTY_NFT_PROGRAM_ID");

// programs/treasure-deposit/src/lib.rs
declare_id!("YOUR_TREASURE_DEPOSIT_PROGRAM_ID");
```

2. **Anchor.toml**
```toml
[programs.devnet]
dotty_nft = "YOUR_DOTTY_NFT_PROGRAM_ID"
treasure_deposit = "YOUR_TREASURE_DEPOSIT_PROGRAM_ID"
```

3. **Root .env**
```bash
DOTTY_NFT_PROGRAM_ID=YOUR_DOTTY_NFT_PROGRAM_ID
TREASURE_DEPOSIT_PROGRAM_ID=YOUR_TREASURE_DEPOSIT_PROGRAM_ID
```

Then rebuild and redeploy:
```bash
anchor build
anchor deploy --provider.cluster devnet
```

## Frontend Integration

### React Components

The project includes React components for wallet integration:

```
src/
├── components/solana/
│   ├── WalletProvider.tsx     # Wallet adapter provider
│   ├── WalletButton.tsx       # Connect wallet button
│   └── TreasureDeposit.tsx    # Deposit UI component
└── pages/
    └── TreasureDepositPage.tsx # Example page
```

### Using in Your App

```typescript
import { WalletProvider } from './components/solana/WalletProvider';
import { TreasureDepositPage } from './pages/TreasureDepositPage';

function App() {
  return (
    <WalletProvider>
      <TreasureDepositPage />
    </WalletProvider>
  );
}
```

### Interacting with Programs

```typescript
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import treasureDepositIdl from '../solana/target/idl/treasure_deposit.json';

function MyComponent() {
  const { connection } = useConnection();
  const { wallet } = useWallet();

  const deposit = async (amount: number) => {
    const provider = new AnchorProvider(connection, wallet.adapter, {});
    const program = new Program(treasureDepositIdl, provider);

    await program.methods
      .depositForMonster(new anchor.BN(amount))
      .accounts({
        // ... accounts
      })
      .rpc();
  };
}
```

## Program Descriptions

### 1. dotty-nft

**Purpose**: Mint collectible NFTs found in the game

**Instructions**:
- `mint_collectible` - Mint NFT to player wallet

**Accounts**:
- `Mint` - NFT mint account
- `TokenAccount` - Player's token account
- `Metadata` - Metaplex metadata

**Use Cases**:
- Player finds treasure → backend calls mint_collectible
- Can be called by other programs via CPI

### 2. treasure-deposit

**Purpose**: Deposit memecoins to receive random monster NFTs

**Instructions**:
- `initialize` - Setup vault (one-time, admin only)
- `deposit_for_monster` - Deposit tokens → create deposit record
- `claim_monster` - Mark deposit as claimed (frontend handles NFT)
- `whitelist_token` - Admin whitelists token mints
- `update_vault` - Admin updates settings

**Accounts**:
- `TreasureVault` - Program configuration (PDA)
- `DepositRecord` - Player's deposit record (PDA per deposit)
- `TokenWhitelist` - Whitelisted tokens (PDA per token)

**Use Cases**:
- Player deposits 100 PEPE → gets random monster type
- Player claims → NFT minted via frontend/backend
- Admin whitelists new memecoins

## Cross-Program Invocation (CPI)

Programs can call each other! Example: treasure-deposit calling dotty-nft to mint:

```rust
// In treasure-deposit program
pub fn claim_monster(ctx: Context<ClaimMonster>) -> Result<()> {
    // Call dotty-nft to mint monster
    let cpi_program = ctx.accounts.dotty_nft_program.to_account_info();
    let cpi_accounts = dotty_nft::cpi::accounts::MintCollectible {
        // ... accounts
    };

    dotty_nft::cpi::mint_collectible(
        CpiContext::new(cpi_program, cpi_accounts),
        "Monster NFT".to_string(),
        "DOTTY".to_string(),
        "https://metadata.url".to_string(),
    )?;

    Ok(())
}
```

To enable this, add dependency in Cargo.toml:
```toml
[dependencies]
dotty-nft = { path = "../dotty-nft", features = ["cpi"] }
```

## Adding New Programs

1. **Create program directory**
```bash
mkdir -p programs/my-new-program/src
```

2. **Create Cargo.toml**
```toml
[package]
name = "my-new-program"
version = "0.1.0"

[lib]
crate-type = ["cdylib", "lib"]
name = "my_new_program"

[dependencies]
anchor-lang = "0.30.1"
```

3. **Create lib.rs**
```rust
use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod my_new_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
```

4. **Update Anchor.toml**
```toml
[programs.localnet]
my_new_program = "11111111111111111111111111111111"

[programs.devnet]
my_new_program = "11111111111111111111111111111111"
```

5. **Create tests**
```bash
touch tests/my-new-program.ts
```

6. **Build and test**
```bash
anchor build
anchor test
```

## Development Workflow

1. **Make changes** to program code
2. **Build**: `anchor build`
3. **Test locally**: `anchor test`
4. **Deploy to devnet**: `anchor deploy --provider.cluster devnet`
5. **Update program IDs** in code
6. **Rebuild**: `anchor build`
7. **Test on devnet**: `anchor test --provider.cluster devnet`
8. **Integrate with frontend**: Copy IDL to frontend
9. **Test end-to-end**: Test with React components

## Troubleshooting

### "Program ID mismatch"
- Update `declare_id!()` in lib.rs after deployment
- Update Anchor.toml
- Rebuild with `anchor build`

### "Tests fail with account not found"
- Run `anchor test` (not `anchor test --skip-deploy`)
- This will deploy to local validator first

### "Transaction simulation failed"
- Check account constraints in Rust code
- Verify all required accounts are passed
- Check you have enough SOL for rent

### "Cannot find module 'target/types/...'"
- Run `anchor build` to generate TypeScript types
- TypeScript types are auto-generated from IDL

## Best Practices

### 1. Keep Programs Focused
- One responsibility per program
- Use CPI for cross-program functionality
- Easier to test and maintain

### 2. Use PDAs for User Data
- Deterministic addresses
- No private key needed
- Example: `seeds = [b"deposit", user.key().as_ref()]`

### 3. Validate Everything
- Use account constraints (`#[account(constraint = ...)]`)
- Check signer authority
- Validate amounts and state

### 4. Test Thoroughly
- Unit tests for each instruction
- Integration tests for full flows
- Error case tests

### 5. Version Control IDL Files
- Commit IDL files to git
- Frontend needs exact IDL to interact
- Track changes over time

## Resources

- [Anchor Book](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Program Examples](https://github.com/coral-xyz/anchor/tree/master/examples)
- [CONTRACTS-GUIDE.md](./CONTRACTS-GUIDE.md) - Beginner's guide

## Next Steps

1. ✅ Build both programs: `anchor build`
2. ✅ Run all tests: `npm run test:solana`
3. ⏭️ Deploy to devnet
4. ⏭️ Integrate with React frontend
5. ⏭️ Add more programs as needed

Happy building! 🚀
