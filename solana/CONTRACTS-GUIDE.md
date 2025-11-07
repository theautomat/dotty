# Solana Smart Contracts Guide for Dotty

A beginner-friendly guide to understanding Solana smart contracts (programs) and how they work in the Dotty game.

## Table of Contents
- [What Are Solana Programs?](#what-are-solana-programs)
- [How Solana Differs from Ethereum](#how-solana-differs-from-ethereum)
- [Anchor Framework Basics](#anchor-framework-basics)
- [Account Model Explained](#account-model-explained)
- [Our Contract Architecture](#our-contract-architecture)
- [Example: NFT Minting Contract](#example-nft-minting-contract)
- [Example: Treasure Deposit Contract](#example-treasure-deposit-contract)

---

## What Are Solana Programs?

In Solana, "smart contracts" are called **programs**. They're compiled code (Rust → BPF bytecode) that runs on the Solana blockchain.

### Key Concepts

**Programs are stateless**
- Programs don't store data themselves
- All data lives in separate **accounts**
- Programs just contain logic (functions)

**Everything is an account**
- Your wallet? An account
- An NFT? An account
- Program data? An account
- The program itself? Also an account!

**Programs process instructions**
- Like API endpoints, but on-chain
- Each instruction = a function call
- Instructions can call other programs (CPI - Cross-Program Invocation)

---

## How Solana Differs from Ethereum

| Ethereum | Solana |
|----------|--------|
| **Storage**: Contracts store state internally | **Storage**: Separate accounts hold state |
| **Execution**: Smart contract = code + data | **Execution**: Program = code only, data external |
| **Cost**: Gas per operation | **Cost**: Rent for storage (can be exempt) |
| **Speed**: ~15 TPS | **Speed**: ~65,000 TPS |
| **Language**: Solidity | **Language**: Rust (with Anchor framework) |

### Example Comparison

**Ethereum (Solidity):**
```solidity
contract NFT {
    mapping(address => uint256) public balances; // Stored IN contract

    function mint(address to) public {
        balances[to] += 1; // Modifies contract storage
    }
}
```

**Solana (Anchor/Rust):**
```rust
#[program]
pub mod nft {
    pub fn mint(ctx: Context<Mint>) -> Result<()> {
        // Data stored in SEPARATE accounts passed via ctx.accounts
        let token_account = &mut ctx.accounts.token_account;
        token_account.amount = 1; // Modifies account passed to us
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Mint<'info> {
    #[account(mut)] // This is a SEPARATE account
    pub token_account: Account<'info, TokenAccount>,
}
```

---

## Anchor Framework Basics

Anchor is a framework that makes Solana development easier. Think of it like Rails for Ruby or Express for Node.js.

### Core Components

#### 1. **Programs** (Your Logic)
```rust
#[program]
pub mod my_program {
    use super::*;

    // These are your "smart contract functions"
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // Function logic here
        Ok(())
    }

    pub fn do_something(ctx: Context<DoSomething>, amount: u64) -> Result<()> {
        // Function logic here
        Ok(())
    }
}
```

#### 2. **Accounts** (Your Data Structures)
```rust
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 32)]
    pub my_account: Account<'info, MyData>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// The actual data structure
#[account]
pub struct MyData {
    pub owner: Pubkey,
    pub count: u64,
}
```

#### 3. **Account Constraints** (Security Rules)
```rust
#[account(
    init,                    // Create this account
    payer = user,           // User pays for creation
    space = 8 + 32 + 8,     // 8 (discriminator) + 32 (Pubkey) + 8 (u64)
    seeds = [b"my-seed"],   // Derive address from seed
    bump                     // Find valid bump for PDA
)]
pub my_pda: Account<'info, MyData>,

#[account(mut)]             // This account will be modified
pub user: Signer<'info>,   // This must sign the transaction

#[account(
    mut,
    constraint = owner.key() == user.key() // Custom validation
)]
pub owner: Account<'info, MyData>,
```

---

## Account Model Explained

This is the most important concept to understand!

### Accounts Store Everything

```
┌─────────────────────────────────────┐
│         Solana Account              │
├─────────────────────────────────────┤
│ Address (Pubkey)                    │  <- Unique identifier
│ Lamports (Balance)                  │  <- SOL balance (1 SOL = 10^9 lamports)
│ Data (bytes)                        │  <- Arbitrary data
│ Owner (Program ID)                  │  <- Which program controls this account
│ Executable (bool)                   │  <- Is this a program?
│ Rent Epoch                          │  <- When rent is due
└─────────────────────────────────────┘
```

### Types of Accounts

**1. Wallet Accounts**
```
Address: 7KG...abc (your public key)
Owner: System Program
Data: Empty
Lamports: 1000000000 (1 SOL)
```

**2. Token Accounts** (hold your NFTs/tokens)
```
Address: 5Hf...xyz
Owner: Token Program
Data: {
  mint: 3kD...def,        // Which token/NFT
  owner: 7KG...abc,       // Your wallet
  amount: 1               // How many
}
Lamports: 2039280 (rent)
```

**3. Program Data Accounts** (custom data)
```
Address: PDA(["treasure", user_key])
Owner: Our Program
Data: {
  owner: 7KG...abc,
  deposit_amount: 100,
  monsters_minted: 3
}
Lamports: 1000000 (rent)
```

### Program Derived Addresses (PDAs)

PDAs are special addresses derived from seeds. They're **owned by your program** and deterministic.

```rust
// Find a PDA
let (pda, bump) = Pubkey::find_program_address(
    &[
        b"treasure",           // Seed 1: constant
        user.key().as_ref()    // Seed 2: user's wallet
    ],
    program_id                 // Your program ID
);

// Result: Always the same address for the same user!
// Example: For user 7KG...abc, PDA will always be 9Qw...xyz
```

**Why use PDAs?**
- Deterministic: Same inputs = same address
- No private key: Only your program can sign for them
- Perfect for user-specific data: Each user gets their own account

---

## Our Contract Architecture

We'll use a **multi-program workspace** for scalability:

```
solana/
├── programs/
│   ├── dotty-nft/          # NFT minting (already exists)
│   │   └── src/lib.rs
│   └── treasure-deposit/   # NEW: Deposit memecoins → get NFTs
│       └── src/lib.rs
├── tests/
│   ├── dotty-nft.ts
│   └── treasure-deposit.ts
└── Anchor.toml             # Configures both programs
```

### Why Multiple Programs?

**Modularity**
- Each program has one responsibility
- Easier to test and maintain
- Can upgrade independently

**Composability**
- Programs can call each other (CPI)
- Mix and match functionality
- Example: `treasure-deposit` calls `dotty-nft` to mint

**Security**
- Smaller attack surface per program
- Easier to audit
- Bugs isolated to one program

---

## Example: NFT Minting Contract

Let's break down our existing `dotty-nft` program:

### The Program
```rust
#[program]
pub mod dotty_nft {
    pub fn mint_collectible(
        ctx: Context<MintCollectible>,
        metadata_title: String,
        metadata_symbol: String,
        metadata_uri: String,
    ) -> Result<()> {
        // 1. Mint 1 token to player's account
        mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    authority: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                },
            ),
            1, // Amount: 1 (NFT)
        )?;

        // 2. Create Metaplex metadata
        let metadata_data = DataV2 {
            name: metadata_title,
            symbol: metadata_symbol,
            uri: metadata_uri,
            // ... other fields
        };

        create_metadata_accounts_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 { /* ... */ },
            ),
            metadata_data,
            false,
            true,
            None,
        )?;

        Ok(())
    }
}
```

### The Accounts Structure
```rust
#[derive(Accounts)]
pub struct MintCollectible<'info> {
    /// Player receiving the NFT
    #[account(mut)]
    pub player: SystemAccount<'info>,

    /// Backend wallet paying for transaction
    #[account(mut)]
    pub payer: Signer<'info>,

    /// New mint account for this NFT
    #[account(
        init,                    // Create new account
        payer = payer,          // Payer pays rent
        mint::decimals = 0,     // NFTs have 0 decimals
        mint::authority = payer,
        mint::freeze_authority = payer,
    )]
    pub mint: Account<'info, Mint>,

    /// Player's token account to receive NFT
    #[account(
        init_if_needed,                        // Create if doesn't exist
        payer = payer,
        associated_token::mint = mint,         // For this mint
        associated_token::authority = player,  // Owned by player
    )]
    pub token_account: Account<'info, TokenAccount>,

    /// Metaplex metadata account
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    // Program accounts (constants)
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metaplex>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}
```

### What Happens When Called?

```
User calls: mint_collectible("Golden Fragment", "DOTTY", "https://...")

1. Accounts validated:
   ✓ Player account exists
   ✓ Payer is a signer
   ✓ Mint account doesn't exist (will be created)
   ✓ Token account may not exist (will be created if needed)

2. Accounts created:
   → Mint account created (new NFT)
   → Token account created for player (if needed)
   → Metadata account created (Metaplex standard)

3. Token minted:
   → 1 token sent to player's token account

4. Result:
   → Player now owns 1 NFT
   → NFT visible in Phantom wallet
```

---

## Example: Treasure Deposit Contract

Now let's design our new contract! This will let players:
1. Deposit memecoins (PEPE, BONK, etc.)
2. Get random monster NFTs in return

### Design Overview

```
Player deposits 100 PEPE tokens
    ↓
Contract validates whitelisted token
    ↓
Transfer PEPE from player to vault
    ↓
Create PDA to track deposit
    ↓
Randomly determine monster type
    ↓
Call dotty-nft program to mint monster NFT
    ↓
Player receives monster NFT
```

### The Program (Simplified)
```rust
#[program]
pub mod treasure_deposit {
    use super::*;

    /// Initialize the treasure vault (one-time setup)
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.total_deposits = 0;
        Ok(())
    }

    /// Deposit memecoins to get monster NFT
    pub fn deposit_for_monster(
        ctx: Context<DepositForMonster>,
        amount: u64,
    ) -> Result<()> {
        // 1. Validate amount
        require!(amount >= 100, ErrorCode::InsufficientDeposit);

        // 2. Transfer tokens from player to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.player_token_account.to_account_info(),
                    to: ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.player.to_account_info(),
                },
            ),
            amount,
        )?;

        // 3. Record deposit in player's PDA
        let deposit_record = &mut ctx.accounts.deposit_record;
        deposit_record.player = ctx.accounts.player.key();
        deposit_record.amount = amount;
        deposit_record.timestamp = Clock::get()?.unix_timestamp;
        deposit_record.claimed = false;

        // 4. Determine random monster (simple version)
        let monster_type = (amount % 3) as u8; // 0, 1, or 2

        // 5. TODO: Call dotty-nft to mint monster
        // (Will show full CPI example below)

        Ok(())
    }

    /// Claim monster NFT after deposit
    pub fn claim_monster(ctx: Context<ClaimMonster>) -> Result<()> {
        let deposit_record = &mut ctx.accounts.deposit_record;

        // Validate not already claimed
        require!(!deposit_record.claimed, ErrorCode::AlreadyClaimed);

        // Mark as claimed
        deposit_record.claimed = true;

        // Call NFT minting program
        // ... CPI to dotty-nft ...

        Ok(())
    }
}
```

### Account Structures
```rust
/// Vault account (stores program config)
#[account]
pub struct TreasureVault {
    pub authority: Pubkey,      // Admin who can update settings
    pub total_deposits: u64,    // Total tokens deposited
}

/// Player deposit record (one per player)
#[account]
pub struct DepositRecord {
    pub player: Pubkey,         // Player's wallet
    pub amount: u64,            // Amount deposited
    pub timestamp: i64,         // When deposited
    pub claimed: bool,          // Has NFT been claimed?
    pub monster_type: u8,       // Which monster (0-2)
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8
    )]
    pub vault: Account<'info, TreasureVault>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositForMonster<'info> {
    /// Player depositing tokens
    #[account(mut)]
    pub player: Signer<'info>,

    /// Player's token account (source)
    #[account(mut)]
    pub player_token_account: Account<'info, TokenAccount>,

    /// Vault's token account (destination)
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Deposit record PDA (unique per player)
    #[account(
        init,
        payer = player,
        space = 8 + 32 + 8 + 8 + 1 + 1,
        seeds = [b"deposit", player.key().as_ref()],
        bump
    )]
    pub deposit_record: Account<'info, DepositRecord>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
```

### Cross-Program Invocation (CPI)

How `treasure-deposit` calls `dotty-nft` to mint:

```rust
// Inside treasure-deposit program
pub fn claim_monster(ctx: Context<ClaimMonster>) -> Result<()> {
    // ... validation ...

    // Call the dotty-nft program to mint
    let cpi_program = ctx.accounts.dotty_nft_program.to_account_info();
    let cpi_accounts = dotty_nft::cpi::accounts::MintCollectible {
        player: ctx.accounts.player.to_account_info(),
        payer: ctx.accounts.authority.to_account_info(),
        mint: ctx.accounts.nft_mint.to_account_info(),
        token_account: ctx.accounts.nft_token_account.to_account_info(),
        metadata: ctx.accounts.metadata.to_account_info(),
        // ... other accounts ...
    };

    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    // Call the other program!
    dotty_nft::cpi::mint_collectible(
        cpi_ctx,
        "Monster NFT #123".to_string(),
        "DOTTY".to_string(),
        "https://metadata.url/monster.json".to_string(),
    )?;

    Ok(())
}
```

---

## Key Takeaways

### 1. Programs vs Accounts
- **Programs** = stateless logic (functions)
- **Accounts** = stateful data (storage)
- Programs operate on accounts passed to them

### 2. Everything Costs Rent
- Accounts need SOL to exist (rent)
- Can be "rent-exempt" with enough SOL
- Calculation: ~0.002 SOL per 100 bytes

### 3. PDAs Are Powerful
- Deterministic addresses
- No private key needed
- Perfect for user-specific data

### 4. Security Through Constraints
- Anchor validates accounts automatically
- Use constraints to enforce rules
- Always check: signer, mut, ownership

### 5. Composability
- Programs can call other programs (CPI)
- Build complex systems from simple programs
- Think LEGO blocks, not monoliths

---

## Next Steps

Now that you understand the basics, we'll:

1. ✅ Create the `treasure-deposit` program
2. ✅ Set up multi-program workspace
3. ✅ Add comprehensive tests
4. ✅ Build React components to interact
5. ✅ Create web UI for deposit/claim flow

Ready to build! 🚀

---

## Additional Resources

- [Anchor Book](https://book.anchor-lang.com/) - Official Anchor guide
- [Solana Cookbook](https://solanacookbook.com/) - Code examples
- [Solana Program Library](https://spl.solana.com/) - Standard programs
- [Program Examples](https://github.com/coral-xyz/anchor/tree/master/examples) - Anchor examples

**Questions?** Check the comments in the code or ask the team!
