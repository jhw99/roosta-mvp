use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::{
    create_master_edition_v3, create_metadata_accounts_v3,
    mpl_token_metadata::types::DataV2, CreateMasterEditionV3, CreateMetadataAccountsV3, Metadata,
};
use anchor_spl::token::{
    freeze_account, mint_to, FreezeAccount, Mint, MintTo, Token, TokenAccount,
};

use crate::constants::*;
use crate::errors::RoostaError;
use crate::state::*;

pub const POSITION_AUTHORITY_SEED: &[u8] = b"position_authority";

#[derive(Accounts)]
pub struct MintPositionNft<'info> {
    #[account(mut)]
    pub member: Signer<'info>,

    #[account(
        seeds = [CIRCLE_SEED, circle.authority.as_ref(), &circle.circle_id.to_le_bytes()],
        bump = circle.bump,
    )]
    pub circle: Box<Account<'info, Circle>>,

    #[account(
        mut,
        seeds = [MEMBER_SEED, circle.key().as_ref(), member.key().as_ref()],
        bump = member_status.bump,
        constraint = member_status.wallet == member.key() @ RoostaError::NotMember,
    )]
    pub member_status: Box<Account<'info, MemberStatus>>,

    /// CHECK: PDA used as mint authority and freeze authority for position NFTs.
    #[account(
        seeds = [POSITION_AUTHORITY_SEED, circle.key().as_ref()],
        bump,
    )]
    pub position_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = member,
        mint::decimals = 0,
        mint::authority = position_authority,
        mint::freeze_authority = position_authority,
    )]
    pub position_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = member,
        associated_token::mint = position_mint,
        associated_token::authority = member,
    )]
    pub position_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: Created by Metaplex CPI; PDA seeds verified by token-metadata program.
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: Created by Metaplex CPI.
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    pub token_metadata_program: Program<'info, Metadata>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<MintPositionNft>) -> Result<()> {
    require!(
        ctx.accounts.member_status.position_nft_mint == Pubkey::default(),
        RoostaError::PositionNftAlreadyMinted
    );

    let circle_key = ctx.accounts.circle.key();
    let payout_order = ctx.accounts.member_status.payout_order;
    let circle_name = ctx.accounts.circle.name.clone();

    let auth_bump = ctx.bumps.position_authority;
    let auth_seeds: &[&[u8]] = &[
        POSITION_AUTHORITY_SEED,
        circle_key.as_ref(),
        std::slice::from_ref(&auth_bump),
    ];
    let signer_seeds: &[&[&[u8]]] = &[auth_seeds];

    // 1. Mint 1 token to position_token_account, signed by position_authority PDA.
    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.position_mint.to_account_info(),
                to: ctx.accounts.position_token_account.to_account_info(),
                authority: ctx.accounts.position_authority.to_account_info(),
            },
            signer_seeds,
        ),
        1,
    )?;

    // 2. Create Metaplex Metadata.
    let name = format!("Roosta Position #{} - {}", payout_order + 1, circle_name);
    let truncated_name = if name.len() > 32 { name[..32].to_string() } else { name };
    let uri = format!(
        "https://roosta-mvp.vercel.app/api/nft-metadata/position/{}/{}",
        circle_key, payout_order
    );
    let truncated_uri = if uri.len() > 200 { uri[..200].to_string() } else { uri };

    let data = DataV2 {
        name: truncated_name,
        symbol: "RPOS".to_string(),
        uri: truncated_uri,
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };

    create_metadata_accounts_v3(
        CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata.to_account_info(),
                mint: ctx.accounts.position_mint.to_account_info(),
                mint_authority: ctx.accounts.position_authority.to_account_info(),
                payer: ctx.accounts.member.to_account_info(),
                update_authority: ctx.accounts.position_authority.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            signer_seeds,
        ),
        data,
        true,  // is_mutable
        true,  // update_authority_is_signer
        None,  // collection_details
    )?;

    // 3. Freeze the token account BEFORE create_master_edition_v3, because
    //    that CPI transfers freeze_authority from the position_authority PDA
    //    to the master edition PDA. After freezing, the NFT becomes
    //    non-transferable and the freeze authority being later moved is fine.
    freeze_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        FreezeAccount {
            account: ctx.accounts.position_token_account.to_account_info(),
            mint: ctx.accounts.position_mint.to_account_info(),
            authority: ctx.accounts.position_authority.to_account_info(),
        },
        signer_seeds,
    ))?;

    // 4. Create Master Edition v3 (max_supply=0 -> unique NFT, no prints).
    create_master_edition_v3(
        CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMasterEditionV3 {
                edition: ctx.accounts.master_edition.to_account_info(),
                mint: ctx.accounts.position_mint.to_account_info(),
                update_authority: ctx.accounts.position_authority.to_account_info(),
                mint_authority: ctx.accounts.position_authority.to_account_info(),
                payer: ctx.accounts.member.to_account_info(),
                metadata: ctx.accounts.metadata.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            signer_seeds,
        ),
        Some(0),
    )?;

    // 5. Record mint on member_status.
    ctx.accounts.member_status.position_nft_mint = ctx.accounts.position_mint.key();

    msg!(
        "Minted Roosta Position NFT mint={} order={} to member={}",
        ctx.accounts.position_mint.key(),
        payout_order,
        ctx.accounts.member.key()
    );

    Ok(())
}
