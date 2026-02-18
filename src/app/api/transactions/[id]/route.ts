import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateTotals } from "@/lib/calculations";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.transaction.delete({ where: { id } });
    const transactions = await prisma.transaction.findMany({
      orderBy: { date: "asc" },
    });
    const totals = calculateTotals(transactions);
    return NextResponse.json({ totals });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
