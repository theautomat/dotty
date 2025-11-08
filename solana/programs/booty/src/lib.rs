use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Burn, Mint, MintTo, Token, TokenAccount},
};

declare_id!("BootyTokenProgram11111111111111111111111111");

#[program]
pub mod booty {
    use super::*;

    /// Initialize the BOOTY token mint and program configuration
    /// This is a one-time setup that creates the token and establishes the mint authority
    pub fn initialize(
        ctx: Context<Initialize>,
        decimals: u8,
        max_supply: Option<u64>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.mint = ctx.accounts.mint.key();
        config.mint_authority = ctx.accounts.authority.key();
        config.total_mined = 0;
        config.total_burned = 0;
        config.max_supply = max_supply;
        config.bump = ctx.bumps.config;

        msg!("BOOTY token initialized!");
        msg!("Mint: {}", config.mint);
        msg!("Authority: {}", config.mint_authority);
        msg!("Decimals: {}", decimals);
        if let Some(max) = max_supply {
            msg!("Max supply: {}", max);
        } else {
            msg!("Max supply: unlimited");
        }

        Ok(())
    }

    /// Mine BOOTY tokens for a player
    /// This is called when a player buries treasure (deposits tokens to the game)
    /// The amount mined is proportional to the treasure value buried
    pub fn mine_tokens(
        ctx: Context<MineTokens>,
        amount: u64,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        // Check max supply if set
        if let Some(max_supply) = config.max_supply {
            let new_total = config.total_mined
                .checked_add(amount)
                .ok_or(ErrorCode::ArithmeticOverflow)?;
            require!(
                new_total <= max_supply,
                ErrorCode::MaxSupplyExceeded
            );
        }

        msg!("Mining {} BOOTY tokens for player {}", amount, ctx.accounts.player.key());

        // Mint tokens to the player's token account
        let seeds = &[
            b"config".as_ref(),
            &[config.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.player_token_account.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        // Update total mined
        config.total_mined = config.total_mined
            .checked_add(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        msg!("Successfully mined {} BOOTY tokens", amount);
        msg!("Total mined: {}", config.total_mined);

        Ok(())
    }

    /// Burn BOOTY tokens from a player
    /// This is called when a player uses BOOTY to move their ship
    pub fn burn_tokens(
        ctx: Context<BurnTokens>,
        amount: u64,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        msg!("Burning {} BOOTY tokens from player {}", amount, ctx.accounts.player.key());

        // Burn tokens from the player's token account
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.player_token_account.to_account_info(),
                    authority: ctx.accounts.player.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update total burned
        config.total_burned = config.total_burned
            .checked_add(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        msg!("Successfully burned {} BOOTY tokens", amount);
        msg!("Total burned: {}", config.total_burned);
        msg!("Net supply: {}", config.total_mined - config.total_burned);

        Ok(())
    }

    /// Update the mint authority (admin only)
    /// Allows transferring control of the token to a new authority
    pub fn update_authority(
        ctx: Context<UpdateAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        msg!("Updating mint authority from {} to {}", config.mint_authority, new_authority);

        config.mint_authority = new_authority;

        msg!("Authority updated successfully");

        Ok(())
    }

    /// Update max supply (admin only)
    /// Can only increase or set to unlimited, cannot decrease
    pub fn update_max_supply(
        ctx: Context<UpdateAuthority>,
        new_max_supply: Option<u64>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        if let Some(new_max) = new_max_supply {
            if let Some(current_max) = config.max_supply {
                require!(
                    new_max >= current_max,
                    ErrorCode::CannotDecreaseMaxSupply
                );
            }
            msg!("Updating max supply to {}", new_max);
        } else {
            msg!("Removing max supply limit (unlimited)");
        }

        config.max_supply = new_max_supply;

        Ok(())
    }
}

// ====================================================================
// ACCOUNT STRUCTURES
// ====================================================================

/// Program configuration and mint tracking
#[account]
pub struct BootyConfig {
    pub mint: Pubkey,              // The BOOTY token mint address (32 bytes)
    pub mint_authority: Pubkey,    // Authority that can mint tokens (32 bytes)
    pub total_mined: u64,          // Total tokens mined (8 bytes)
    pub total_burned: u64,         // Total tokens burned (8 bytes)
    pub max_supply: Option<u64>,   // Maximum supply (1 + 8 bytes)
    pub bump: u8,                  // PDA bump (1 byte)
}

impl BootyConfig {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1 + 8 + 1; // discriminator + fields
}

// ====================================================================
// ACCOUNT CONTEXTS
// ====================================================================

#[derive(Accounts)]
#[instruction(decimals: u8)]
pub struct Initialize<'info> {
    /// The BOOTY token mint
    #[account(
        init,
        payer = authority,
        mint::decimals = decimals,
        mint::authority = config,
    )]
    pub mint: Account<'info, Mint>,

    /// Program configuration PDA
    #[account(
        init,
        payer = authority,
        space = BootyConfig::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, BootyConfig>,

    /// The authority initializing the program
    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MineTokens<'info> {
    /// The BOOTY token mint
    #[account(
        mut,
        constraint = mint.key() == config.mint @ ErrorCode::InvalidMint
    )]
    pub mint: Account<'info, Mint>,

    /// Program configuration PDA (also the mint authority)
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, BootyConfig>,

    /// Player receiving the tokens
    /// CHECK: This is the player's wallet address
    pub player: AccountInfo<'info>,

    /// Player's BOOTY token account
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = player,
    )]
    pub player_token_account: Account<'info, TokenAccount>,

    /// Payer for account creation (game backend or admin)
    #[account(mut)]
    pub payer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    /// The BOOTY token mint
    #[account(
        mut,
        constraint = mint.key() == config.mint @ ErrorCode::InvalidMint
    )]
    pub mint: Account<'info, Mint>,

    /// Program configuration PDA
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, BootyConfig>,

    /// Player burning their tokens
    pub player: Signer<'info>,

    /// Player's BOOTY token account
    #[account(
        mut,
        constraint = player_token_account.owner == player.key() @ ErrorCode::InvalidTokenAccount
    )]
    pub player_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateAuthority<'info> {
    /// Program configuration PDA
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.mint_authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, BootyConfig>,

    /// Current authority
    pub authority: Signer<'info>,
}

// ====================================================================
// ERROR CODES
// ====================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Maximum supply exceeded")]
    MaxSupplyExceeded,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("You are not authorized to perform this action")]
    Unauthorized,

    #[msg("Invalid token mint")]
    InvalidMint,

    #[msg("Invalid token account")]
    InvalidTokenAccount,

    #[msg("Cannot decrease max supply")]
    CannotDecreaseMaxSupply,
}
