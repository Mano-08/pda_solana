use anchor_lang::prelude::*;

declare_id!("5PHVkoS94fLyX12QvKdYTwsyVAdPSPXv668UK13d41Bk");

#[account]
pub struct Counter {
    pub count: u8,
    authority: Pubkey
}

#[error_code]
pub enum CustomError {
    #[msg("Unauthorized.")]
    Unauthorized,
}

#[program]
pub mod pda_db {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, count: u8) -> Result<()> {
        let pda_account = &mut ctx.accounts.pda_account;
        pda_account.count = count;
        pda_account.authority = *ctx.accounts.signer.key;
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let pda_account = &mut ctx.accounts.pda_account;
        // Compare *signer.key (Pubkey) with pda_account.authority (Pubkey)
        require!(
            *ctx.accounts.signer.key == pda_account.authority,
            CustomError::Unauthorized
        );
        pda_account.count += 1;
        Ok(())
    }
}


#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        mut,
        seeds = [b"count_data", signer.key().as_ref()],
        bump,
    )]
    pub pda_account: Account<'info, Counter>
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = 8 + 32 + 1,
        seeds = [b"count_data", signer.key().as_ref()],
        bump,
        )]
    pub pda_account: Account<'info, Counter>,
    pub system_program: Program<'info, System>,
}
