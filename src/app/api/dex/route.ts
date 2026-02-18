import { NextResponse } from "next/server";

const TOKEN_ADDRESS = "0xF2018F4Bd8894b14af98861bb1Fd54E3f55ed68f";

export async function GET() {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`
    );
    const data = await res.json();
    const pair = data?.pairs?.find((p: { chainId: string }) => p.chainId === "bsc");

    if (!pair) {
      return NextResponse.json({ priceUsd: null, liquidity: null, volume: null });
    }

    const liquidity = pair.liquidity
      ? {
          usd: pair.liquidity.usd ?? 0,
          base: pair.liquidity.base ?? 0,
          quote: pair.liquidity.quote ?? 0,
        }
      : null;

    const volume = pair.volume ? { h24: pair.volume.h24 ?? 0, h6: pair.volume.h6 ?? 0 } : null;
    const txns = pair.txns ? { h24: pair.txns.h24, h6: pair.txns.h6 } : null;

    return NextResponse.json({
      priceUsd: pair.priceUsd ?? null,
      liquidity,
      volume,
      txns,
    });
  } catch {
    return NextResponse.json({
      priceUsd: null,
      liquidity: null,
      volume: null,
    });
  }
}
