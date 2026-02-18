import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateTotals } from "@/lib/calculations";

const PAIR_ADDRESS = "0x98882c197445a025824f6f403363a3fdb200ddad";
const SWAP_TOPIC = "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822";
const MINT_TOPIC = "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f";
const BURN_TOPIC = "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496";
const DECIMALS = 18;

function parseHexToNum(hex: string): number {
  return parseInt(hex, 16) / Math.pow(10, DECIMALS);
}

export async function POST() {
  const apiKey = process.env.BSCSCAN_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "BSCSCAN_API_KEY not set. Add it in Railway for chain sync." },
      { status: 503 }
    );
  }

  try {
    const existing = await prisma.transaction.findMany({
      where: { txHash: { not: null } },
      select: { txHash: true },
    });
    const knownHashes = new Set(existing.map((t) => t.txHash).filter(Boolean) as string[]);

    const logsRes = await fetch(
      `https://api.bscscan.com/api?module=logs&action=getLogs&address=${PAIR_ADDRESS}&topic0=${SWAP_TOPIC}&page=1&offset=1000&apikey=${apiKey}`
    );
    const swapData = await logsRes.json();
    if (swapData.status !== "1" || !Array.isArray(swapData.result)) {
      return NextResponse.json({
        synced: 0,
        message: swapData.message || "No swap logs",
        transactions: await prisma.transaction.findMany({ orderBy: { date: "asc" } }),
        totals: calculateTotals(await prisma.transaction.findMany()),
      });
    }

    const toInsert: { date: Date; type: string; tokens: number; usdt: number; notes: string | null; txHash: string }[] = [];

    for (const log of swapData.result) {
      const txHash = log.transactionHash?.toLowerCase();
      if (!txHash || knownHashes.has(txHash)) continue;

      const data = (log.data || "").slice(2);
      if (data.length < 256) continue;

      const amount0In = parseHexToNum(data.slice(0, 64));
      const amount1In = parseHexToNum(data.slice(64, 128));
      const amount0Out = parseHexToNum(data.slice(128, 192));
      const amount1Out = parseHexToNum(data.slice(192, 256));

      const timestamp = parseInt(log.timeStamp, 10) * 1000;
      const date = new Date(timestamp);

      if (amount1Out > 0 && amount0In > 0) {
        toInsert.push({
          date,
          type: "BUY",
          tokens: amount1Out,
          usdt: amount0In,
          notes: txHash,
          txHash,
        });
      } else if (amount1In > 0 && amount0Out > 0) {
        toInsert.push({
          date,
          type: "SELL",
          tokens: amount1In,
          usdt: amount0Out,
          notes: txHash,
          txHash,
        });
      }
      knownHashes.add(txHash);
    }

    const mintRes = await fetch(
      `https://api.bscscan.com/api?module=logs&action=getLogs&address=${PAIR_ADDRESS}&topic0=${MINT_TOPIC}&page=1&offset=500&apikey=${apiKey}`
    );
    const mintData = await mintRes.json();
    if (mintData.status === "1" && Array.isArray(mintData.result)) {
      for (const log of mintData.result) {
        const txHash = log.transactionHash?.toLowerCase();
        if (!txHash || knownHashes.has(txHash)) continue;

        const data = (log.data || "").slice(2);
        if (data.length < 128) continue;

        const amount0 = parseHexToNum(data.slice(0, 64));
        const amount1 = parseHexToNum(data.slice(64, 128));
        const timestamp = parseInt(log.timeStamp, 10) * 1000;

        toInsert.push({
          date: new Date(timestamp),
          type: "LIQUIDITY_ADD",
          tokens: amount1,
          usdt: amount0,
          notes: txHash,
          txHash,
        });
        knownHashes.add(txHash);
      }
    }

    const burnRes = await fetch(
      `https://api.bscscan.com/api?module=logs&action=getLogs&address=${PAIR_ADDRESS}&topic0=${BURN_TOPIC}&page=1&offset=500&apikey=${apiKey}`
    );
    const burnData = await burnRes.json();
    if (burnData.status === "1" && Array.isArray(burnData.result)) {
      for (const log of burnData.result) {
        const txHash = log.transactionHash?.toLowerCase();
        if (!txHash || knownHashes.has(txHash)) continue;

        const data = (log.data || "").slice(2);
        if (data.length < 128) continue;

        const amount0 = parseHexToNum(data.slice(0, 64));
        const amount1 = parseHexToNum(data.slice(64, 128));
        const timestamp = parseInt(log.timeStamp, 10) * 1000;

        toInsert.push({
          date: new Date(timestamp),
          type: "LIQUIDITY_REMOVE",
          tokens: amount1,
          usdt: amount0,
          notes: txHash,
          txHash,
        });
        knownHashes.add(txHash);
      }
    }

    for (const tx of toInsert) {
      try {
        await prisma.transaction.create({ data: tx });
      } catch {
        // already exists (txHash unique)
      }
    }

    const transactions = await prisma.transaction.findMany({
      orderBy: { date: "asc" },
    });
    const totals = calculateTotals(transactions);

    return NextResponse.json({
      synced: toInsert.length,
      transactions,
      totals,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
