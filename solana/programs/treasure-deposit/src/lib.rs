use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod treasure_deposit {
    use super::*;

    /// Initialize the treasure vault (one-time setup by admin)
    /// This creates the main vault account that stores program configuration
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.total_deposits = 0;
        vault.total_monsters_minted = 0;
        vault.bump = ctx.bumps.vault;

        msg!("Treasure vault initialized!");
        msg!("Authority: {}", vault.authority);

        Ok(())
    }

    /// Deposit memecoins to get a monster NFT
    /// Player sends tokens → vault stores them → creates deposit record
    pub fn deposit_for_monster(
        ctx: Context<DepositForMonster>,
        amount: u64,
    ) -> Result<()> {
        // Validate minimum deposit amount (100 tokens with 6 decimals = 100,000,000)
        require!(amount >= 100_000_000, ErrorCode::InsufficientDeposit);

        msg!("Player depositing {} tokens", amount);

        // Transfer tokens from player to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.player_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.player.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, amount)?;

        msg!("Tokens transferred successfully");

        // Record deposit in player's PDA
        let deposit_record = &mut ctx.accounts.deposit_record;
        deposit_record.player = ctx.accounts.player.key();
        deposit_record.amount = amount;
        deposit_record.timestamp = Clock::get()?.unix_timestamp;
        deposit_record.claimed = false;
        deposit_record.bump = ctx.bumps.deposit_record;

        // Determine monster type based on deposit amount
        // Simple algorithm: amount % 5 gives us 5 different monster types
        deposit_record.monster_type = ((amount / 100_000_000) % 5) as u8;

        // Update vault stats
        let vault = &mut ctx.accounts.vault;
        vault.total_deposits = vault.total_deposits.checked_add(amount).unwrap();

        msg!("Deposit recorded! Monster type: {}", deposit_record.monster_type);
        msg!("Player can now claim their monster NFT");

        Ok(())
    }

    /// Claim monster NFT after deposit
    /// This marks the deposit as claimed (minting handled by frontend for now)
    pub fn claim_monster(ctx: Context<ClaimMonster>) -> Result<()> {
        let deposit_record = &mut ctx.accounts.deposit_record;

        // Validate not already claimed
        require!(!deposit_record.claimed, ErrorCode::AlreadyClaimed);

        msg!("Player claiming monster type: {}", deposit_record.monster_type);

        // Mark as claimed
        deposit_record.claimed = true;

        // Update vault stats
        let vault = &mut ctx.accounts.vault;
        vault.total_monsters_minted = vault.total_monsters_minted.checked_add(1).unwrap();

        msg!("Monster claimed! Total minted: {}", vault.total_monsters_minted);

        // Note: Actual NFT minting will be done via CPI to dotty-nft
        // or handled by backend. We just track the claim here.

        Ok(())
    }

    /// Admin function to whitelist a token mint
    /// This allows adding new memecoins that can be deposited
    pub fn whitelist_token(
        ctx: Context<WhitelistToken>,
        token_mint: Pubkey,
    ) -> Result<()> {
        let whitelist = &mut ctx.accounts.whitelist;
        whitelist.token_mint = token_mint;
        whitelist.enabled = true;
        whitelist.bump = ctx.bumps.whitelist;

        msg!("Token whitelisted: {}", token_mint);

        Ok(())
    }

    /// Admin function to update vault settings
    pub fn update_vault(
        ctx: Context<UpdateVault>,
        new_authority: Option<Pubkey>,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        if let Some(authority) = new_authority {
            vault.authority = authority;
            msg!("Vault authority updated to: {}", authority);
        }

        Ok(())
    }
}

// ============================================================================
// Account Structures
// ============================================================================

/// Main vault account storing program configuration
#[account]
pub struct TreasureVault {
    pub authority: Pubkey,           // Admin who can update settings (32 bytes)
    pub total_deposits: u64,         // Total tokens deposited (8 bytes)
    pub total_monsters_minted: u64,  // Total monsters claimed (8 bytes)
    pub bump: u8,                    // PDA bump (1 byte)
}

impl TreasureVault {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 1; // discriminator + fields
}

/// Player deposit record (one per player per deposit)
#[account]
pub struct DepositRecord {
    pub player: Pubkey,       // Player's wallet (32 bytes)
    pub amount: u64,          // Amount deposited (8 bytes)
    pub timestamp: i64,       // When deposited (8 bytes)
    pub claimed: bool,        // Has NFT been claimed? (1 byte)
    pub monster_type: u8,     // Which monster (0-4) (1 byte)
    pub bump: u8,             // PDA bump (1 byte)
}

impl DepositRecord {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 1 + 1 + 1; // discriminator + fields
}

/// Token whitelist entry (which tokens can be deposited)
#[account]
pub struct TokenWhitelist {
    pub token_mint: Pubkey,   // Token mint address (32 bytes)
    pub enabled: bool,        // Is this token enabled? (1 byte)
    pub bump: u8,             // PDA bump (1 byte)
}

impl TokenWhitelist {
    pub const LEN: usize = 8 + 32 + 1 + 1; // discriminator + fields
}

// ============================================================================
// Account Contexts (defines which accounts each instruction needs)
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    /// Vault PDA that stores program config
    #[account(
        init,
        payer = authority,
        space = TreasureVault::LEN,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, TreasureVault>,

    /// Admin who initializes the program
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositForMonster<'info> {
    /// Player making the deposit
    #[account(mut)]
    pub player: Signer<'info>,

    /// Player's token account (source of tokens)
    #[account(
        mut,
        constraint = player_token_account.owner == player.key() @ ErrorCode::InvalidTokenAccount
    )]
    pub player_token_account: Account<'info, TokenAccount>,

    /// Vault's token account (destination)
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Vault PDA
    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump
    )]
    pub vault: Account<'info, TreasureVault>,

    /// Deposit record PDA (unique per player, per deposit)
    /// Using timestamp as seed to allow multiple deposits per player
    #[account(
        init,
        payer = player,
        space = DepositRecord::LEN,
        seeds = [
            b"deposit",
            player.key().as_ref(),
            &Clock::get()?.unix_timestamp.to_le_bytes()
        ],
        bump
    )]
    pub deposit_record: Account<'info, DepositRecord>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimMonster<'info> {
    /// Player claiming the monster
    pub player: Signer<'info>,

    /// Deposit record being claimed
    #[account(
        mut,
        constraint = deposit_record.player == player.key() @ ErrorCode::Unauthorized,
        constraint = !deposit_record.claimed @ ErrorCode::AlreadyClaimed
    )]
    pub deposit_record: Account<'info, DepositRecord>,

    /// Vault PDA
    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump
    )]
    pub vault: Account<'info, TreasureVault>,
}

#[derive(Accounts)]
pub struct WhitelistToken<'info> {
    /// Whitelist PDA for this token
    #[account(
        init,
        payer = authority,
        space = TokenWhitelist::LEN,
        seeds = [b"whitelist", token_mint.key().as_ref()],
        bump
    )]
    pub whitelist: Account<'info, TokenWhitelist>,

    /// Token mint being whitelisted
    /// CHECK: We're just storing the pubkey, not reading data
    pub token_mint: UncheckedAccount<'info>,

    /// Vault PDA
    #[account(
        seeds = [b"vault"],
        bump = vault.bump,
        constraint = vault.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub vault: Account<'info, TreasureVault>,

    /// Admin authority
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateVault<'info> {
    /// Vault PDA
    #[account(
        mut,
        seeds = [b"vault"],
        bump = vault.bump,
        constraint = vault.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub vault: Account<'info, TreasureVault>,

    /// Current admin authority
    pub authority: Signer<'info>,
}

// ============================================================================
// Error Codes
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Deposit amount is too low (minimum 100 tokens)")]
    InsufficientDeposit,

    #[msg("Monster NFT has already been claimed for this deposit")]
    AlreadyClaimed,

    #[msg("You are not authorized to perform this action")]
    Unauthorized,

    #[msg("Invalid token account")]
    InvalidTokenAccount,
}
