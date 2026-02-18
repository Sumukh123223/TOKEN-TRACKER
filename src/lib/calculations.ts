export type TxType = "LIQUIDITY_ADD" | "LIQUIDITY_REMOVE" | "BUY" | "SELL";

export interface Transaction {
  id: string;
  date: Date;
  type: string;
  tokens: number;
  usdt: number;
  notes: string | null;
}

const TOTAL_SUPPLY = 1_000_000_000;

export function calculateTotals(transactions: Transaction[]) {
  let totalLiquidityAdded = 0;
  let tokensInPool = 0;
  let usdtInPool = 0;

  for (const tx of transactions) {
    switch (tx.type) {
      case "LIQUIDITY_ADD":
        totalLiquidityAdded += tx.usdt;
        tokensInPool += tx.tokens;
        usdtInPool += tx.usdt;
        break;
      case "LIQUIDITY_REMOVE":
        totalLiquidityAdded -= tx.usdt;
        tokensInPool -= tx.tokens;
        usdtInPool -= tx.usdt;
        break;
      case "BUY":
        tokensInPool -= tx.tokens;
        usdtInPool += tx.usdt;
        break;
      case "SELL":
        tokensInPool += tx.tokens;
        usdtInPool -= tx.usdt;
        break;
    }
  }

  return {
    totalSupply: TOTAL_SUPPLY,
    totalLiquidityAdded,
    tokensInPool,
    usdtInPool,
  };
}
