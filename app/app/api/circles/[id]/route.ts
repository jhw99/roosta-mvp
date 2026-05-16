import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "@/lib/roosta-idl.json";
import type { Roosta } from "@/lib/roosta-types";

export const runtime = "nodejs";
export const revalidate = 15;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const circlePk = new PublicKey(id);
    const rpc = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpc, "confirmed");
    const provider = new anchor.AnchorProvider(
      connection,
      {} as anchor.Wallet,
      { commitment: "confirmed" }
    );
    const program = new anchor.Program(idl as Roosta, provider);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const acct: any = program.account;

    const circle = await acct.circle.fetch(circlePk);

    // Fetch current round.
    const [roundPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("round"), circlePk.toBuffer(), Buffer.from([circle.currentRound])],
      program.programId
    );
    let round = null;
    try {
      round = await acct.round.fetch(roundPda);
    } catch {
      round = null;
    }

    // Fetch member statuses for each member.
    const members = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (circle.members as any[]).map(async (wallet) => {
        const [pda] = PublicKey.findProgramAddressSync(
          [Buffer.from("member"), circlePk.toBuffer(), wallet.toBuffer()],
          program.programId
        );
        try {
          const ms = await acct.memberStatus.fetch(pda);
          return {
            wallet: wallet.toBase58(),
            payoutOrder: ms.payoutOrder,
            statusEnum: ms.statusEnum,
            collateralAmount: ms.collateralAmount.toString(),
            lockedReserveAmount: ms.lockedReserveAmount.toString(),
            defaultCount: ms.defaultCount,
            totalDeposited: ms.totalDeposited.toString(),
            depositCount: ms.depositCount,
            missedCount: ms.missedCount,
            receivedAmount: ms.receivedAmount.toString(),
            positionNftMint: ms.positionNftMint.toBase58(),
          };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json(
      {
        circle: {
          publicKey: circlePk.toBase58(),
          authority: circle.authority.toBase58(),
          circleId: circle.circleId.toString(),
          name: circle.name,
          memberCount: circle.memberCount,
          totalRounds: circle.totalRounds,
          currentRound: circle.currentRound,
          contributionAmount: circle.contributionAmount.toString(),
          roundDuration: circle.roundDuration.toString(),
          startedAt: circle.startedAt.toString(),
          status: circle.status,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          members: (circle.members as any[]).map((m) => m.toBase58()),
          payoutOrder: circle.payoutOrder,
          trustGateEnabled: circle.trustGateEnabled,
          riskDepositEnabled: circle.riskDepositEnabled,
          lockedReserveEnabled: circle.lockedReserveEnabled,
          earlyPositionCollateralRatio: circle.earlyPositionCollateralRatio,
          lockedReserveRatio: circle.lockedReserveRatio,
          gracePeriodSeconds: circle.gracePeriodSeconds.toString(),
          collateralVault: circle.collateralVault.toBase58(),
          riskCollateralsCollected: circle.riskCollateralsCollected,
          round1Activated: circle.round1Activated,
        },
        round: round
          ? {
              publicKey: roundPda.toBase58(),
              roundNumber: round.roundNumber,
              recipient: round.recipient.toBase58(),
              depositsCount: round.depositsCount,
              status: round.status,
              startedAt: round.startedAt.toString(),
              deadline: round.deadline.toString(),
              delayedAt: round.delayedAt?.toString() ?? "0",
              totalCollected: round.totalCollected.toString(),
              payoutAmount: round.payoutAmount.toString(),
              reserveAmount: round.reserveAmount.toString(),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              deposits: (round.deposits as any[]).map((d) => d.toBase58()),
            }
          : null,
        members,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=15, stale-while-revalidate=30",
        },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
