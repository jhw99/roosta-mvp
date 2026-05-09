import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import idl from "@/lib/roosta-idl.json";
import type { Roosta } from "@/lib/roosta-types";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ circle: string; order: string }> }
) {
  try {
    const { circle, order } = await ctx.params;
    const orderNum = Number.parseInt(order, 10);
    if (Number.isNaN(orderNum) || orderNum < 0 || orderNum > 255) {
      return NextResponse.json(
        { error: "Invalid order parameter" },
        { status: 400 }
      );
    }

    let circlePk: PublicKey;
    try {
      circlePk = new PublicKey(circle);
    } catch {
      return NextResponse.json(
        { error: "Invalid circle pubkey" },
        { status: 400 }
      );
    }

    const rpc = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpc, "confirmed");
    const provider = new anchor.AnchorProvider(
      connection,
      {} as anchor.Wallet,
      { commitment: "confirmed" }
    );
    const program = new anchor.Program(idl as Roosta, provider);

    let circleName = "Roosta Circle";
    let totalRounds: number | null = null;
    let contributionAmount: string | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const acc: any = await (program.account as any).circle.fetch(circlePk);
      if (typeof acc.name === "string") circleName = acc.name;
      if (typeof acc.totalRounds === "number") totalRounds = acc.totalRounds;
      if (acc.contributionAmount) contributionAmount = acc.contributionAmount.toString();
    } catch {
      // Circle not found on this cluster — return generic metadata.
    }

    const positionNumber = orderNum + 1;
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://roosta-mvp.vercel.app";
    const image = `${baseUrl}/nft/position-default.png`;

    const attributes: Array<{ trait_type: string; value: string | number }> = [
      { trait_type: "nft_type", value: "PositionNFT" },
      { trait_type: "circle_id", value: circlePk.toBase58() },
      { trait_type: "circle_name", value: circleName },
      { trait_type: "payout_order", value: orderNum },
      { trait_type: "position_number", value: positionNumber },
      { trait_type: "status", value: "Active" },
    ];
    if (totalRounds !== null) {
      attributes.push({ trait_type: "total_rounds", value: totalRounds });
    }
    if (contributionAmount !== null) {
      attributes.push({
        trait_type: "contribution_amount",
        value: contributionAmount,
      });
    }

    const body = {
      name: `Roosta Position #${positionNumber} - ${circleName}`,
      symbol: "RPOS",
      description: `Position ${positionNumber} in the Roosta circle "${circleName}". Non-transferable membership NFT representing rotation slot in this ROSCA.`,
      image,
      external_url: `${baseUrl}/circles/${circlePk.toBase58()}`,
      attributes,
      properties: {
        category: "image",
        files: [{ uri: image, type: "image/png" }],
      },
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "internal error" },
      { status: 500 }
    );
  }
}
