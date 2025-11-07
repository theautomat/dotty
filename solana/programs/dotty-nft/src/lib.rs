use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
        Metadata as Metaplex,
    },
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod dotty_nft {
    use super::*;

    /// Mint a collectible NFT to a player
    /// This is called by the game backend after validating the player found a collectible
    pub fn mint_collectible(
        ctx: Context<MintCollectible>,
        metadata_title: String,
        metadata_symbol: String,
        metadata_uri: String,
    ) -> Result<()> {
        msg!("Minting collectible NFT");
        msg!("Metadata Title: {}", metadata_title);
        msg!("Metadata URI: {}", metadata_uri);

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
            seller_fee_basis_points: 0, // No royalties for now
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
}

#[derive(Accounts)]
pub struct MintCollectible<'info> {
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
