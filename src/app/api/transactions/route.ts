import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateTotals } from "@/lib/calculations";

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: "asc" },
    });
    const totals = calculateTotals(transactions);
    return NextResponse.json({ transactions, totals });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, type, tokens, usdt, notes } = body;

    if (!date || !type || tokens == null || usdt == null) {
      return NextResponse.json(
        { error: "Missing required fields: date, type, tokens, usdt" },
        { status: 400 }
      );
    }

    const validTypes = ["LIQUIDITY_ADD", "LIQUIDITY_REMOVE", "BUY", "SELL"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
    }

    const tx = await prisma.transaction.create({
      data: {
        date: new Date(date),
        type,
        tokens: parseFloat(tokens),
        usdt: parseFloat(usdt),
        notes: notes || null,
      },
    });

    const transactions = await prisma.transaction.findMany({
      orderBy: { date: "asc" },
    });
    const totals = calculateTotals(transactions);

    return NextResponse.json({ transactions, totals });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}
