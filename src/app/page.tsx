"use client";

import { useEffect, useState } from "react";

type TxType = "LIQUIDITY_ADD" | "LIQUIDITY_REMOVE" | "BUY" | "SELL";

interface Transaction {
  id: string;
  date: string;
  type: string;
  tokens: number;
  usdt: number;
  notes: string | null;
}

interface Totals {
  totalSupply: number;
  totalLiquidityAdded: number;
  tokensInPool: number;
  usdtInPool: number;
}

export default function TrackerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "LIQUIDITY_ADD" as TxType,
    tokens: "",
    usdt: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function fetchData() {
    try {
      const [txRes, priceRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/price"),
      ]);
      const txData = await txRes.json();
      const priceData = await priceRes.json();
      if (txData.transactions) setTransactions(txData.transactions);
      if (txData.totals) setTotals(txData.totals);
      if (priceData.priceUsd) setPrice(priceData.priceUsd);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          type: form.type,
          tokens: parseFloat(form.tokens) || 0,
          usdt: parseFloat(form.usdt) || 0,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (data.transactions) setTransactions(data.transactions);
      if (data.totals) setTotals(data.totals);
      setForm({ ...form, tokens: "", usdt: "", notes: "" });
    } catch (e) {
      console.error(e);
      alert("Failed to add transaction");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this transaction?")) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.totals) setTotals(data.totals);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  const typeLabels: Record<string, string> = {
    LIQUIDITY_ADD: "Liquidity Add",
    LIQUIDITY_REMOVE: "Liquidity Remove",
    BUY: "Buy",
    SELL: "Sell",
  };

  const priceNum = price ? parseFloat(price) : 0;
  const poolValueUsd =
    totals && priceNum
      ? totals.tokensInPool * priceNum + totals.usdtInPool
      : null;

  if (loading) {
    return <div className="text-muted">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted">Total Supply</div>
          <div className="text-lg font-semibold">
            {totals?.totalSupply.toLocaleString() ?? "—"} LXV
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted">Total Liquidity Added</div>
          <div className="text-lg font-semibold">
            ${totals?.totalLiquidityAdded.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "—"}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted">Current Price</div>
          <div className="text-lg font-semibold">
            {price ? `$${parseFloat(price).toFixed(10)}` : "—"}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted">Tokens in Pool</div>
          <div className="text-lg font-semibold">
            {totals?.tokensInPool.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? "—"} LXV
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted">USDT in Pool</div>
          <div className="text-lg font-semibold">
            ${totals?.usdtInPool.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? "—"}
          </div>
        </div>
      </div>
      {poolValueUsd != null && (
        <div className="rounded-lg border border-primary/50 bg-primary/10 p-4">
          <div className="text-xs text-muted">Estimated Pool Value (USD)</div>
          <div className="text-xl font-bold text-primary">
            ${poolValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
      )}

      {/* Add Transaction Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-border bg-card p-6"
      >
        <h2 className="mb-4 text-lg font-semibold">Add Transaction</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs text-muted">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as TxType })}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
            >
              {(["LIQUIDITY_ADD", "LIQUIDITY_REMOVE", "BUY", "SELL"] as const).map((t) => (
                <option key={t} value={t}>
                  {typeLabels[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Tokens (LXV)</label>
            <input
              type="number"
              step="any"
              placeholder="0"
              value={form.tokens}
              onChange={(e) => setForm({ ...form, tokens: e.target.value })}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">USDT</label>
            <input
              type="number"
              step="any"
              placeholder="0"
              value={form.usdt}
              onChange={(e) => setForm({ ...form, usdt: e.target.value })}
              className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-primary px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1 block text-xs text-muted">Notes (optional)</label>
          <input
            type="text"
            placeholder="e.g. Tx hash, LP add, whale buy"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          />
        </div>
      </form>

      {/* Transaction List */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <h2 className="border-b border-border p-4 text-lg font-semibold">
          All Transactions
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-4">Date</th>
                <th className="p-4">Type</th>
                <th className="p-4">Tokens</th>
                <th className="p-4">USDT</th>
                <th className="p-4">Notes</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted">
                    No transactions yet. Add your first one above.
                  </td>
                </tr>
              ) : (
                [...transactions].reverse().map((tx) => (
                  <tr key={tx.id} className="border-b border-border hover:bg-bg/50">
                    <td className="p-4">
                      {new Date(tx.date).toLocaleDateString()}
                    </td>
                    <td className="p-4">{typeLabels[tx.type] ?? tx.type}</td>
                    <td className="p-4 font-mono">
                      {tx.tokens.toLocaleString(undefined, { maximumFractionDigits: 4 })} LXV
                    </td>
                    <td className="p-4 font-mono">
                      ${tx.usdt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-muted max-w-[200px] truncate">
                      {tx.notes || "—"}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
