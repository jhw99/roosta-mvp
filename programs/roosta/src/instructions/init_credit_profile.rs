use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
use anchor_spl::associated_token::{self, AssociatedToken};
use anchor_spl::token_2022::{initialize_mint2, mint_to, InitializeMint2, MintTo, Token2022};
use anchor_spl::token_2022_extensions::non_transferable_mint_initialize;
use anchor_spl::token_2022_extensions::non_transferable::NonTransferableMintInitialize;
use anchor_spl::token_2022::spl_token_2022::extension::ExtensionType;
use anchor_spl::token_2022::spl_token_2022::state::Mint as MintState;

use crate::constants::*;
use crate::state::*;

pub const SBT_MINT_SEED: &[u8] = b"credit_sbt";
pub const SBT_AUTHORITY_SEED: &[u8] = b"sbt_authority";

#[derive(Accounts)]
pub struct InitCreditProfile<'info> {
    #[account(mut)]
    pub wallet: Signer<'info>,

    #[account(
        init_if_needed,
        payer = wallet,
        space = CreditProfile::SPACE,
        seeds = [CREDIT_SEED, wallet.key().as_ref()],
        bump
    )]
    pub credit_profile: Account<'info, CreditProfile>,

    /// CHECK: PDA mint account; created and validated manually inside the
    /// handler when minting the SBT for the first time.
    #[account(
        mut,
        seeds = [SBT_MINT_SEED, wallet.key().as_ref()],
        bump
    )]
    pub sbt_mint: UncheckedAccount<'info>,

    /// CHECK: ATA for SBT, created via associated_token CPI in handler.
    #[account(mut)]
    pub sbt_token_account: UncheckedAccount<'info>,

    /// CHECK: PDA used as mint + freeze authority for the SBT.
    #[account(seeds = [SBT_AUTHORITY_SEED], bump)]
    pub sbt_authority: UncheckedAccount<'info>,

    pub token_2022_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<InitCreditProfile>) -> Result<()> {
    let wallet_key = ctx.accounts.wallet.key();
    let needs_profile_init = ctx.accounts.credit_profile.wallet == Pubkey::default();

    if needs_profile_init {
        let cp = &mut ctx.accounts.credit_profile;
        let clock = Clock::get()?;
        cp.wallet = wallet_key;
        cp.trust_tier = TrustTier::Tier0New;
        cp.circles_completed = 0;
        cp.on_time_payments = 0;
        cp.late_payments = 0;
        cp.defaults = 0;
        cp.total_volume = 0;
        cp.last_updated_at = clock.unix_timestamp;
        cp.early_position_eligible = false;
        cp.sbt_mint = Pubkey::default();
        cp.bump = ctx.bumps.credit_profile;
    }

    // Idempotent: only mint the SBT on the first call.
    if ctx.accounts.credit_profile.sbt_mint != Pubkey::default() {
        return Ok(());
    }

    // ----- Mint Token-2022 NonTransferable SBT -----

    let mint_bump = ctx.bumps.sbt_mint;
    let authority_bump = ctx.bumps.sbt_authority;

    let mint_seeds: &[&[u8]] = &[
        SBT_MINT_SEED,
        wallet_key.as_ref(),
        std::slice::from_ref(&mint_bump),
    ];
    let mint_signer: &[&[&[u8]]] = &[mint_seeds];

    let authority_seeds: &[&[u8]] = &[SBT_AUTHORITY_SEED, std::slice::from_ref(&authority_bump)];
    let authority_signer: &[&[&[u8]]] = &[authority_seeds];

    // 1. Allocate mint account with space for NonTransferable extension.
    let mint_size =
        ExtensionType::try_calculate_account_len::<MintState>(&[ExtensionType::NonTransferable])
            .map_err(|_| ProgramError::InvalidAccountData)?;
    let rent_lamports = Rent::get()?.minimum_balance(mint_size);

    let create_ix = system_instruction::create_account(
        ctx.accounts.wallet.key,
        ctx.accounts.sbt_mint.key,
        rent_lamports,
        mint_size as u64,
        &anchor_spl::token_2022::spl_token_2022::ID,
    );
    anchor_lang::solana_program::program::invoke_signed(
        &create_ix,
        &[
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.sbt_mint.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        mint_signer,
    )?;

    // 2. Initialize NonTransferable extension (must run BEFORE initialize_mint).
    non_transferable_mint_initialize(CpiContext::new(
        ctx.accounts.token_2022_program.to_account_info(),
        NonTransferableMintInitialize {
            token_program_id: ctx.accounts.token_2022_program.to_account_info(),
            mint: ctx.accounts.sbt_mint.to_account_info(),
        },
    ))?;

    // 3. Initialize the base mint (decimals = 0, authorities = sbt_authority PDA).
    initialize_mint2(
        CpiContext::new(
            ctx.accounts.token_2022_program.to_account_info(),
            InitializeMint2 {
                mint: ctx.accounts.sbt_mint.to_account_info(),
            },
        ),
        0,
        &ctx.accounts.sbt_authority.key(),
        Some(&ctx.accounts.sbt_authority.key()),
    )?;

    // 4. Create the user's ATA for this Token-2022 mint.
    associated_token::create(CpiContext::new(
        ctx.accounts.associated_token_program.to_account_info(),
        associated_token::Create {
            payer: ctx.accounts.wallet.to_account_info(),
            associated_token: ctx.accounts.sbt_token_account.to_account_info(),
            authority: ctx.accounts.wallet.to_account_info(),
            mint: ctx.accounts.sbt_mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_2022_program.to_account_info(),
        },
    ))?;

    // 5. Mint exactly 1 token to the user's ATA, signed by sbt_authority PDA.
    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_2022_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.sbt_mint.to_account_info(),
                to: ctx.accounts.sbt_token_account.to_account_info(),
                authority: ctx.accounts.sbt_authority.to_account_info(),
            },
            authority_signer,
        ),
        1,
    )?;

    // 6. Record the SBT mint on the CreditProfile.
    ctx.accounts.credit_profile.sbt_mint = ctx.accounts.sbt_mint.key();

    msg!(
        "Minted Roosta credit SBT mint={} to wallet={}",
        ctx.accounts.sbt_mint.key(),
        wallet_key
    );

    Ok(())
}
