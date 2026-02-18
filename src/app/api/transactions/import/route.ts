import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateTotals } from "@/lib/calculations";

const VALID_TYPES = ["LIQUIDITY_ADD", "LIQUIDITY_REMOVE", "BUY", "SELL"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactions: raw } = body;

    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json(
        { error: "Provide an array of transactions" },
        { status: 400 }
      );
    }

    const toInsert: { date: Date; type: string; tokens: number; usdt: number; notes: string | null }[] = [];

    for (const t of raw) {
      const type = (t.type || t.Type || "").toUpperCase().replace(/\s/g, "_");
      const mapped =
        type === "LIQUIDITY_ADD" || type === "ADD"
          ? "LIQUIDITY_ADD"
          : type === "LIQUIDITY_REMOVE" || type === "REMOVE"
          ? "LIQUIDITY_REMOVE"
          : type === "BUY"
          ? "BUY"
          : type === "SELL"
          ? "SELL"
          : null;

      if (!mapped || !VALID_TYPES.includes(mapped)) continue;

      const tokens = parseFloat(t.tokens ?? t.Tokens ?? t.lxv ?? t.LXV ?? 0) || 0;
      const usdt = parseFloat(t.usdt ?? t.USDT ?? t.usd ?? t.USD ?? 0) || 0;
      const dateStr = t.date ?? t.Date ?? t.timestamp;
      if (!dateStr) continue;

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) continue;

      toInsert.push({
        date,
        type: mapped,
        tokens,
        usdt,
        notes: t.notes ?? t.Notes ?? t.txHash ?? t.hash ?? null,
      });
    }

    if (toInsert.length === 0) {
      return NextResponse.json(
        { error: "No valid transactions to import" },
        { status: 400 }
      );
    }

    await prisma.transaction.createMany({ data: toInsert });

    const transactions = await prisma.transaction.findMany({
      orderBy: { date: "asc" },
    });
    const totals = calculateTotals(transactions);

    return NextResponse.json({
      imported: toInsert.length,
      transactions,
      totals,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
