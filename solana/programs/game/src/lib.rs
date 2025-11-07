use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
        Metadata as Metaplex,
    },
    token::{self, mint_to, Mint, MintTo, Token, TokenAccount, Transfer},
};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod game {
    use super::*;

    // ====================================================================
    // NFT MINTING
    // ====================================================================

    /// Mint an NFT to a player
    /// Universal minting function - works for any collectible type
    /// The metadata_uri determines what the NFT looks like and represents
    pub fn mint_nft(
        ctx: Context<MintNFT>,
        metadata_title: String,
        metadata_symbol: String,
        metadata_uri: String,
    ) -> Result<()> {
        msg!("Minting NFT");
        msg!("Title: {}", metadata_title);
        msg!("URI: {}", metadata_uri);

        // Mint 1 token to the player's token account
        mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    authority: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                },
            ),
            1, // NFTs have a supply of 1
        )?;

        msg!("Token minted successfully");

        // Create metadata account with Metaplex standard
        let metadata_data = DataV2 {
            name: metadata_title,
            symbol: metadata_symbol,
            uri: metadata_uri,
            seller_fee_basis_points: 0, // No royalties
            creators: None,
            collection: None,
            uses: None,
        };

        create_metadata_accounts_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    payer: ctx.accounts.payer.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    metadata: ctx.accounts.metadata.to_account_info(),
                    mint_authority: ctx.accounts.payer.to_account_info(),
                    update_authority: ctx.accounts.payer.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            metadata_data,
            false, // is_mutable
            true,  // update_authority_is_signer
            None,  // collection_details
        )?;

        msg!("Metadata created successfully");

        Ok(())
    }

    // ====================================================================
    // TOKEN DEPOSIT SYSTEM (Optional - for premium NFTs)
    // ====================================================================

    /// Initialize the deposit vault (one-time setup by admin)
    /// This creates the vault that can accept token deposits
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.total_deposits = 0;
        vault.total_claims = 0;
        vault.bump = ctx.bumps.vault;

        msg!("Deposit vault initialized!");
        msg!("Authority: {}", vault.authority);

        Ok(())
    }

    /// Deposit tokens to earn the right to mint a premium NFT
    /// Player sends tokens → vault stores them → creates deposit record
    pub fn deposit_for_nft(
        ctx: Context<DepositForNFT>,
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

        // Calculate tier based on deposit amount
        deposit_record.tier = calculate_tier(amount);

        // Update vault stats
        let vault = &mut ctx.accounts.vault;
        vault.total_deposits = vault.total_deposits.checked_add(amount).unwrap();

        msg!("Deposit recorded! Tier: {}", deposit_record.tier);
        msg!("Player can now claim their premium NFT");

        Ok(())
    }

    /// Claim deposit after depositing tokens
    /// This marks the deposit as claimed so player can mint their premium NFT
    pub fn claim_deposit(ctx: Context<ClaimDeposit>) -> Result<()> {
        let deposit_record = &mut ctx.accounts.deposit_record;

        // Validate not already claimed
        require!(!deposit_record.claimed, ErrorCode::AlreadyClaimed);

        msg!("Player claiming deposit (tier {})", deposit_record.tier);

        // Mark as claimed
        deposit_record.claimed = true;

        // Update vault stats
        let vault = &mut ctx.accounts.vault;
        vault.total_claims = vault.total_claims.checked_add(1).unwrap();

        msg!("Deposit claimed! Total claims: {}", vault.total_claims);

        // Note: Actual NFT minting happens separately via mint_nft instruction
        // This just validates the player has deposited and tracks the claim

        Ok(())
    }

    /// Admin function to whitelist a token mint
    /// This allows adding new tokens that can be deposited
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

// ====================================================================
// HELPER FUNCTIONS
// ====================================================================

/// Calculate tier based on deposit amount (with 6 decimals)
/// Returns tier 1-4, higher tier = more tokens deposited
fn calculate_tier(amount: u64) -> u8 {
    let tokens = amount / 1_000_000; // Convert from lamports to tokens

    if tokens >= 100_000 {
        4 // Legendary tier
    } else if tokens >= 10_000 {
        3 // Epic tier
    } else if tokens >= 1_000 {
        2 // Rare tier
    } else {
        1 // Common tier
    }
}

// ====================================================================
// ACCOUNT STRUCTURES
// ====================================================================

/// Main vault account storing program configuration
#[account]
pub struct DepositVault {
    pub authority: Pubkey,    // Admin who can update settings (32 bytes)
    pub total_deposits: u64,  // Total tokens deposited (8 bytes)
    pub total_claims: u64,    // Total deposits claimed (8 bytes)
    pub bump: u8,             // PDA bump (1 byte)
}

impl DepositVault {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 1; // discriminator + fields
}

/// Player deposit record (one per player per deposit)
#[account]
pub struct DepositRecord {
    pub player: Pubkey,    // Player's wallet (32 bytes)
    pub amount: u64,       // Amount deposited (8 bytes)
    pub timestamp: i64,    // When deposited (8 bytes)
    pub claimed: bool,     // Has deposit been claimed? (1 byte)
    pub tier: u8,          // Tier earned (1-4) (1 byte)
    pub bump: u8,          // PDA bump (1 byte)
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

// ====================================================================
// ACCOUNT CONTEXTS (defines which accounts each instruction needs)
// ====================================================================

#[derive(Accounts)]
pub struct MintNFT<'info> {
    /// The player's wallet that will receive the NFT
    #[account(mut)]
    pub player: SystemAccount<'info>,

    /// The payer/authority (game backend wallet) that pays for and authorizes minting
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The mint account for this specific NFT
    #[account(
        init,
        payer = payer,
        mint::decimals = 0,
        mint::authority = payer,
        mint::freeze_authority = payer,
    )]
    pub mint: Account<'info, Mint>,

    /// The token account that will hold the NFT for the player
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = player,
    )]
    pub token_account: Account<'info, TokenAccount>,

    /// Metaplex metadata account
    /// CHECK: This account is created by the Metaplex program
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metaplex>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    /// Vault PDA that stores program config
    #[account(
        init,
        payer = authority,
        space = DepositVault::LEN,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, DepositVault>,

    /// Admin who initializes the program
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositForNFT<'info> {
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
    pub vault: Account<'info, DepositVault>,

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
pub struct ClaimDeposit<'info> {
    /// Player claiming the deposit
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
    pub vault: Account<'info, DepositVault>,
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
    pub vault: Account<'info, DepositVault>,

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
    pub vault: Account<'info, DepositVault>,

    /// Current admin authority
    pub authority: Signer<'info>,
}

// ====================================================================
// ERROR CODES
// ====================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Deposit amount is too low (minimum 100 tokens)")]
    InsufficientDeposit,

    #[msg("Deposit has already been claimed")]
    AlreadyClaimed,

    #[msg("You are not authorized to perform this action")]
    Unauthorized,

    #[msg("Invalid token account")]
    InvalidTokenAccount,
}
