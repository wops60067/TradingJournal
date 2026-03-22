export interface Trade {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  entry_date: string;
  exit_date: string | null;
  status: 'open' | 'closed';
  pnl: number | null;
  pnl_percent: number | null;
  fees: number;
  strategy: string | null;
  timeframe: string | null;
  entry_reason: string | null;
  exit_reason: string | null;
  review_notes: string | null;
  rating: number | null;
  tags: string | null;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeForm {
  symbol: string;
  direction: 'long' | 'short';
  entry_price: number;
  exit_price?: number | null;
  quantity: number;
  entry_date: string;
  exit_date?: string | null;
  fees?: number;
  strategy?: string;
  timeframe?: string;
  entry_reason?: string;
  exit_reason?: string;
  review_notes?: string;
  rating?: number;
  tags?: string[];
  screenshot_url?: string;
}

export interface TradeStats {
  totalClosed: number;
  totalOpen: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  monthlyPnl: { month: string; pnl: number; trades: number }[];
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  strategyBreakdown: { strategy: string; count: number; totalPnl: number; avgPnl: number; wins: number }[];
}

export interface EquityPoint {
  date: string;
  pnl: number;
  cumulative: number;
}
