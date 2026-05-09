import { NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "@/lib/roosta-idl.json";
import type { Roosta } from "@/lib/roosta-types";

export const runtime = "nodejs";
export const revalidate = 30;

export async function GET() {
  try {
    const rpc = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpc, "confirmed");
    const provider = new anchor.AnchorProvider(
      connection,
      {} as anchor.Wallet,
      { commitment: "confirmed" }
    );
    const program = new anchor.Program(idl as Roosta, provider);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all = await (program.account as any).circle.all();

    // v2 cutoff: filter out v1 circles created before the v2 program upgrade.
    const V2_CUTOFF = 1778250000; // ~2026-05-08 deploy timestamp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v2Only = all.filter((c: any) => {
      const startedAt = Number(c.account.startedAt?.toString() ?? "0");
      return startedAt >= V2_CUTOFF;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = v2Only.map((c: any) => ({
      publicKey: c.publicKey.toBase58(),
      account: {
        authority: c.account.authority.toBase58(),
        circleId: c.account.circleId.toString(),
        name: c.account.name,
        memberCount: c.account.memberCount,
        totalRounds: c.account.totalRounds,
        currentRound: c.account.currentRound,
        contributionAmount: c.account.contributionAmount.toString(),
        roundDuration: c.account.roundDuration.toString(),
        startedAt: c.account.startedAt.toString(),
        status: c.account.status,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        members: c.account.members.map((m: any) => m.toBase58()),
        payoutOrder: c.account.payoutOrder,
      },
    }));

    return NextResponse.json(
      { circles: out },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
