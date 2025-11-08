use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
        Metadata as Metaplex,
    },
    token::{self, mint_to, Mint, MintTo, Token, TokenAccount, Transfer, Burn, burn},
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
        deposit_id: i64,
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
        deposit_record.timestamp = deposit_id;
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

    // ====================================================================
    // $BOOTY TOKEN SYSTEM
    // ====================================================================

    /// Initialize the $BOOTY token mint (one-time setup)
    /// Creates a standard SPL token that the game program controls
    pub fn initialize_booty_mint(
        ctx: Context<InitializeBootyMint>,
        decimals: u8,
        max_supply: Option<u64>,
    ) -> Result<()> {
        let booty_state = &mut ctx.accounts.booty_state;
        booty_state.mint = ctx.accounts.booty_mint.key();
        booty_state.authority = ctx.accounts.authority.key();
        booty_state.total_mined = 0;
        booty_state.total_burned = 0;
        booty_state.max_supply = max_supply;
        booty_state.bump = ctx.bumps.booty_state;

        msg!("$BOOTY token initialized!");
        msg!("Mint: {}", booty_state.mint);
        msg!("Authority: {}", booty_state.authority);
        msg!("Decimals: {}", decimals);
        if let Some(max) = max_supply {
            msg!("Max supply: {}", max);
        } else {
            msg!("Max supply: unlimited");
        }

        Ok(())
    }

    /// Mine (mint) $BOOTY tokens for a player
    /// Called when a player buries treasure - rewards them with BOOTY based on deposit amount
    pub fn mine_booty(
        ctx: Context<MineBooty>,
        amount: u64,
    ) -> Result<()> {
        // Check max supply if set
        if let Some(max_supply) = ctx.accounts.booty_state.max_supply {
            let new_total = ctx.accounts.booty_state.total_mined
                .checked_add(amount)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
            require!(
                new_total <= max_supply,
                ErrorCode::MaxSupplyExceeded
            );
        }

        msg!("Mining {} BOOTY tokens for player {}", amount, ctx.accounts.player.key());

        // Mint tokens using game program as authority
        let bump = ctx.accounts.booty_state.bump;
        let seeds = &[
            b"booty-state".as_ref(),
            &[bump],
        ];
        let signer_seeds = &[&seeds[..]];

        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.booty_mint.to_account_info(),
                    to: ctx.accounts.player_booty_account.to_account_info(),
                    authority: ctx.accounts.booty_state.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        // Update total mined
        let booty_state = &mut ctx.accounts.booty_state;
        booty_state.total_mined = booty_state.total_mined
            .checked_add(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        msg!("Successfully mined {} BOOTY tokens", amount);
        msg!("Total mined: {}", booty_state.total_mined);
        msg!("Net supply: {}", booty_state.total_mined - booty_state.total_burned);

        Ok(())
    }

    /// Burn $BOOTY tokens from a player
    /// Called when a player moves their ship - consumes BOOTY as travel cost
    pub fn burn_booty_for_travel(
        ctx: Context<BurnBootyForTravel>,
        amount: u64,
    ) -> Result<()> {
        let booty_state = &mut ctx.accounts.booty_state;

        msg!("Burning {} BOOTY tokens from player {} for travel", amount, ctx.accounts.player.key());

        // Burn tokens from player's account
        burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.booty_mint.to_account_info(),
                    from: ctx.accounts.player_booty_account.to_account_info(),
                    authority: ctx.accounts.player.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update total burned
        booty_state.total_burned = booty_state.total_burned
            .checked_add(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        msg!("Successfully burned {} BOOTY tokens", amount);
        msg!("Total burned: {}", booty_state.total_burned);
        msg!("Net supply: {}", booty_state.total_mined - booty_state.total_burned);

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

/// BOOTY token state tracking
#[account]
pub struct BootyState {
    pub mint: Pubkey,              // The BOOTY token mint address (32 bytes)
    pub authority: Pubkey,          // Authority that manages the token (32 bytes)
    pub total_mined: u64,          // Total tokens mined/minted (8 bytes)
    pub total_burned: u64,         // Total tokens burned (8 bytes)
    pub max_supply: Option<u64>,   // Optional maximum supply (1 + 8 bytes)
    pub bump: u8,                  // PDA bump (1 byte)
}

impl BootyState {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1 + 8 + 1; // discriminator + fields
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
#[instruction(amount: u64, deposit_id: i64)]
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
    /// Using deposit_id as seed to allow multiple deposits per player
    #[account(
        init,
        payer = player,
        space = DepositRecord::LEN,
        seeds = [
            b"deposit",
            player.key().as_ref(),
            &deposit_id.to_le_bytes()
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

#[derive(Accounts)]
#[instruction(decimals: u8)]
pub struct InitializeBootyMint<'info> {
    /// The BOOTY token mint (standard SPL token)
    #[account(
        init,
        payer = authority,
        mint::decimals = decimals,
        mint::authority = booty_state,
    )]
    pub booty_mint: Account<'info, Mint>,

    /// BOOTY state PDA that tracks supply
    #[account(
        init,
        payer = authority,
        space = BootyState::LEN,
        seeds = [b"booty-state"],
        bump
    )]
    pub booty_state: Account<'info, BootyState>,

    /// Admin who initializes the BOOTY token
    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MineBooty<'info> {
    /// Player receiving BOOTY tokens
    #[account(mut)]
    pub player: Signer<'info>,

    /// BOOTY token mint
    #[account(
        mut,
        constraint = booty_mint.key() == booty_state.mint @ ErrorCode::InvalidBootyMint
    )]
    pub booty_mint: Account<'info, Mint>,

    /// Player's BOOTY token account (auto-created if needed)
    #[account(
        init_if_needed,
        payer = player,
        associated_token::mint = booty_mint,
        associated_token::authority = player,
    )]
    pub player_booty_account: Account<'info, TokenAccount>,

    /// BOOTY state PDA
    #[account(
        mut,
        seeds = [b"booty-state"],
        bump = booty_state.bump
    )]
    pub booty_state: Account<'info, BootyState>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BurnBootyForTravel<'info> {
    /// Player burning BOOTY tokens
    pub player: Signer<'info>,

    /// BOOTY token mint
    #[account(
        mut,
        constraint = booty_mint.key() == booty_state.mint @ ErrorCode::InvalidBootyMint
    )]
    pub booty_mint: Account<'info, Mint>,

    /// Player's BOOTY token account
    #[account(
        mut,
        constraint = player_booty_account.owner == player.key() @ ErrorCode::InvalidTokenAccount
    )]
    pub player_booty_account: Account<'info, TokenAccount>,

    /// BOOTY state PDA
    #[account(
        mut,
        seeds = [b"booty-state"],
        bump = booty_state.bump
    )]
    pub booty_state: Account<'info, BootyState>,

    pub token_program: Program<'info, Token>,
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

    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,

    #[msg("Maximum supply exceeded")]
    MaxSupplyExceeded,

    #[msg("Invalid BOOTY mint")]
    InvalidBootyMint,
}
