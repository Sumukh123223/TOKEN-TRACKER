import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateTotals } from "@/lib/calculations";

const PAIR_ADDRESS = "0x98882c197445a025824f6f403363a3fdb200ddad";
const SWAP_TOPIC = "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822";
const MINT_TOPIC = "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f";
const BURN_TOPIC = "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496";
const DECIMALS = 18;

const RPC_URL = "https://bsc-dataseed.binance.org/";
const DELAY_MS = 4000;
const BLOCK_RANGE = 2000; // Public RPC often limits to 1–2k blocks

function parseHexToNum(hex: string): number {
  return parseInt(hex, 16) / Math.pow(10, DECIMALS);
}

function toHex(n: number): string {
  return "0x" + n.toString(16);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "RPC error");
  return data.result;
}

async function getLogs(topic0: string, fromBlock: number, toBlock: number) {
  const logs = await rpc("eth_getLogs", [
    {
      address: PAIR_ADDRESS,
      topics: [topic0],
      fromBlock: toHex(fromBlock),
      toBlock: toHex(toBlock),
    },
  ]);
  return Array.isArray(logs) ? logs : [];
}

export async function POST() {
  try {
    const existing = await prisma.transaction.findMany({
      where: { txHash: { not: null } },
      select: { txHash: true },
    });
    const knownHashes = new Set(existing.map((t) => t.txHash).filter(Boolean) as string[]);

    await sleep(DELAY_MS);
    const toBlockHex = await rpc("eth_blockNumber", []);
    const toBlock = parseInt(toBlockHex, 16);
    const fromBlock = Math.max(0, toBlock - BLOCK_RANGE);

    // BSC ~3 sec/block; estimate timestamp from block offset
    const nowSec = Math.floor(Date.now() / 1000);
    const blockToTs = (blockNum: number) => (nowSec - (toBlock - blockNum) * 3) * 1000;

    const toInsert: { date: Date; type: string; tokens: number; usdt: number; notes: string | null; txHash: string }[] = [];

    await sleep(DELAY_MS);
    const swapLogs = await getLogs(SWAP_TOPIC, fromBlock, toBlock);

    for (const log of swapLogs) {
      const txHash = (log.transactionHash || "").toLowerCase();
      if (!txHash || knownHashes.has(txHash)) continue;

      const data = (log.data || "").slice(2);
      if (data.length < 256) continue;

      const amount0In = parseHexToNum(data.slice(0, 64));
      const amount1In = parseHexToNum(data.slice(64, 128));
      const amount0Out = parseHexToNum(data.slice(128, 192));
      const amount1Out = parseHexToNum(data.slice(192, 256));

      const blockNum = parseInt(log.blockNumber, 16);
      const date = new Date(blockToTs(blockNum));

      if (amount1Out > 0 && amount0In > 0) {
        toInsert.push({ date, type: "BUY", tokens: amount1Out, usdt: amount0In, notes: txHash, txHash });
      } else if (amount1In > 0 && amount0Out > 0) {
        toInsert.push({ date, type: "SELL", tokens: amount1In, usdt: amount0Out, notes: txHash, txHash });
      }
      knownHashes.add(txHash);
    }

    await sleep(DELAY_MS);
    const mintLogs = await getLogs(MINT_TOPIC, fromBlock, toBlock);

    for (const log of mintLogs) {
      const txHash = (log.transactionHash || "").toLowerCase();
      if (!txHash || knownHashes.has(txHash)) continue;

      const data = (log.data || "").slice(2);
      if (data.length < 128) continue;

      const amount0 = parseHexToNum(data.slice(0, 64));
      const amount1 = parseHexToNum(data.slice(64, 128));
      const blockNum = parseInt(log.blockNumber, 16);

      toInsert.push({
        date: new Date(blockToTs(blockNum)),
        type: "LIQUIDITY_ADD",
        tokens: amount1,
        usdt: amount0,
        notes: txHash,
        txHash,
      });
      knownHashes.add(txHash);
    }

    await sleep(DELAY_MS);
    const burnLogs = await getLogs(BURN_TOPIC, fromBlock, toBlock);

    for (const log of burnLogs) {
      const txHash = (log.transactionHash || "").toLowerCase();
      if (!txHash || knownHashes.has(txHash)) continue;

      const data = (log.data || "").slice(2);
      if (data.length < 128) continue;

      const amount0 = parseHexToNum(data.slice(0, 64));
      const amount1 = parseHexToNum(data.slice(64, 128));
      const blockNum = parseInt(log.blockNumber, 16);

      toInsert.push({
        date: new Date(blockToTs(blockNum)),
        type: "LIQUIDITY_REMOVE",
        tokens: amount1,
        usdt: amount0,
        notes: txHash,
        txHash,
      });
      knownHashes.add(txHash);
    }

    for (const tx of toInsert) {
      try {
        await prisma.transaction.create({ data: tx });
      } catch {
        // already exists
      }
    }

    const transactions = await prisma.transaction.findMany({ orderBy: { date: "asc" } });
    const totals = calculateTotals(transactions);

    return NextResponse.json({ synced: toInsert.length, transactions, totals });
  } catch (e) {
    console.error(e);
    const txList = await prisma.transaction.findMany({ orderBy: { date: "asc" } });
    return NextResponse.json({
      synced: 0,
      message: e instanceof Error ? e.message : "Sync failed",
      transactions: txList,
      totals: calculateTotals(txList),
    });
  }
}
