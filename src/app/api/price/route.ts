import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      "https://api.dexscreener.com/latest/dex/tokens/0xF2018F4Bd8894b14af98861bb1Fd54E3f55ed68f"
    );
    const data = await res.json();
    const pair = data?.pairs?.find((p: { chainId: string }) => p.chainId === "bsc");
    const priceUsd = pair?.priceUsd ?? null;
    return NextResponse.json({ priceUsd });
  } catch {
    return NextResponse.json({ priceUsd: null });
  }
}
