const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const router = express.Router();

// Get all trades with optional filters
router.get('/', (req, res) => {
  const { status, symbol, direction, startDate, endDate, tag, sortBy = 'entry_date', order = 'DESC' } = req.query;

  let query = 'SELECT * FROM trades WHERE 1=1';
  const params = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (symbol) {
    query += ' AND symbol LIKE ?';
    params.push(`%${symbol}%`);
  }
  if (direction) {
    query += ' AND direction = ?';
    params.push(direction);
  }
  if (startDate) {
    query += ' AND entry_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND entry_date <= ?';
    params.push(endDate);
  }
  if (tag) {
    query += ' AND tags LIKE ?';
    params.push(`%${tag}%`);
  }

  const allowedSortColumns = ['entry_date', 'exit_date', 'pnl', 'pnl_percent', 'symbol', 'created_at'];
  const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'entry_date';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${sortColumn} ${sortOrder}`;

  const trades = db.prepare(query).all(...params);
  res.json(trades);
});

// Get trade statistics
router.get('/stats', (_req, res) => {
  const stats = {};

  const totalTrades = db.prepare('SELECT COUNT(*) as count FROM trades WHERE status = ?').get('closed');
  stats.totalClosed = totalTrades.count;

  const openTrades = db.prepare('SELECT COUNT(*) as count FROM trades WHERE status = ?').get('open');
  stats.totalOpen = openTrades.count;

  const winningTrades = db.prepare('SELECT COUNT(*) as count FROM trades WHERE status = ? AND pnl > 0').get('closed');
  stats.winCount = winningTrades.count;

  const losingTrades = db.prepare('SELECT COUNT(*) as count FROM trades WHERE status = ? AND pnl < 0').get('closed');
  stats.lossCount = losingTrades.count;

  stats.winRate = stats.totalClosed > 0 ? ((stats.winCount / stats.totalClosed) * 100).toFixed(2) : 0;

  const pnlStats = db.prepare('SELECT SUM(pnl) as totalPnl, AVG(pnl) as avgPnl FROM trades WHERE status = ?').get('closed');
  stats.totalPnl = pnlStats.totalPnl || 0;
  stats.avgPnl = pnlStats.avgPnl || 0;

  const avgWin = db.prepare('SELECT AVG(pnl) as avg FROM trades WHERE status = ? AND pnl > 0').get('closed');
  stats.avgWin = avgWin.avg || 0;

  const avgLoss = db.prepare('SELECT AVG(pnl) as avg FROM trades WHERE status = ? AND pnl < 0').get('closed');
  stats.avgLoss = avgLoss.avg || 0;

  stats.profitFactor = stats.avgLoss !== 0 ? Math.abs(stats.avgWin / stats.avgLoss).toFixed(2) : 0;

  // Monthly PnL
  const monthlyPnl = db.prepare(`
    SELECT strftime('%Y-%m', exit_date) as month, SUM(pnl) as pnl, COUNT(*) as trades
    FROM trades WHERE status = 'closed' AND exit_date IS NOT NULL
    GROUP BY month ORDER BY month DESC LIMIT 12
  `).all();
  stats.monthlyPnl = monthlyPnl;

  // Best and worst trades
  stats.bestTrade = db.prepare('SELECT * FROM trades WHERE status = ? ORDER BY pnl DESC LIMIT 1').get('closed');
  stats.worstTrade = db.prepare('SELECT * FROM trades WHERE status = ? ORDER BY pnl ASC LIMIT 1').get('closed');

  res.json(stats);
});

// Get equity curve data — grouped by day (one point per day)
router.get('/equity-curve', (_req, res) => {
  const dailyPnl = db.prepare(`
    SELECT exit_date as date, SUM(pnl) as pnl
    FROM trades
    WHERE status = 'closed' AND exit_date IS NOT NULL AND pnl IS NOT NULL
    GROUP BY exit_date
    ORDER BY exit_date ASC
  `).all();

  let cumulative = 0;
  const curve = dailyPnl.map(d => {
    cumulative += d.pnl;
    return { date: d.date, pnl: d.pnl, cumulative };
  });

  res.json(curve);
});

// Get single trade
router.get('/:id', (req, res) => {
  const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
  if (!trade) return res.status(404).json({ error: 'Trade not found' });
  res.json(trade);
});

// Calculate PnL for CFD: (price_diff) * lots * contract_size - fees
function calculatePnl(direction, entryPrice, exitPrice, lots, contractSize, fees) {
  const priceDiff = direction === 'long'
    ? exitPrice - entryPrice
    : entryPrice - exitPrice;
  const pnl = priceDiff * lots * contractSize - (fees || 0);
  const pnlPercent = direction === 'long'
    ? ((exitPrice - entryPrice) / entryPrice * 100)
    : ((entryPrice - exitPrice) / entryPrice * 100);
  return { pnl, pnlPercent };
}

// Create trade
router.post('/', (req, res) => {
  const id = uuidv4();
  const { symbol, direction, entry_price, exit_price, quantity, entry_date, exit_date,
    fees = 0, strategy, timeframe, entry_reason, exit_reason, review_notes, rating, tags, screenshot_url,
    contract_size = 1 } = req.body;

  let status = 'open';
  let pnl = null;
  let pnl_percent = null;

  if (exit_price != null && exit_date) {
    status = 'closed';
    const result = calculatePnl(direction, entry_price, exit_price, quantity, contract_size, fees);
    pnl = result.pnl;
    pnl_percent = result.pnlPercent;
  }

  const stmt = db.prepare(`
    INSERT INTO trades (id, symbol, direction, entry_price, exit_price, quantity, entry_date, exit_date,
      status, pnl, pnl_percent, fees, strategy, timeframe, entry_reason, exit_reason, review_notes, rating, tags, screenshot_url, contract_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, symbol, direction, entry_price, exit_price, quantity, entry_date, exit_date,
    status, pnl, pnl_percent, fees, strategy || null, timeframe, entry_reason, exit_reason, review_notes, rating,
    tags ? JSON.stringify(tags) : null, screenshot_url, contract_size);

  const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(id);
  res.status(201).json(trade);
});

// Update trade
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Trade not found' });

  const { symbol, direction, entry_price, exit_price, quantity, entry_date, exit_date,
    fees, strategy, timeframe, entry_reason, exit_reason, review_notes, rating, tags, screenshot_url,
    contract_size } = req.body;

  const dir = direction || existing.direction;
  const ep = entry_price ?? existing.entry_price;
  const xp = exit_price ?? existing.exit_price;
  const qty = quantity ?? existing.quantity;
  const cs = contract_size ?? existing.contract_size ?? 1;
  const f = fees ?? existing.fees ?? 0;

  let status = existing.status;
  let pnl = existing.pnl;
  let pnl_percent = existing.pnl_percent;

  if (xp != null && (exit_date || existing.exit_date)) {
    status = 'closed';
    const result = calculatePnl(dir, ep, xp, qty, cs, f);
    pnl = result.pnl;
    pnl_percent = result.pnlPercent;
  }

  const stmt = db.prepare(`
    UPDATE trades SET symbol = ?, direction = ?, entry_price = ?, exit_price = ?, quantity = ?,
      entry_date = ?, exit_date = ?, status = ?, pnl = ?, pnl_percent = ?, fees = ?,
      strategy = ?, timeframe = ?, entry_reason = ?, exit_reason = ?, review_notes = ?,
      rating = ?, tags = ?, screenshot_url = ?, contract_size = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  stmt.run(
    symbol || existing.symbol, dir, ep, xp, qty,
    entry_date || existing.entry_date, exit_date ?? existing.exit_date,
    status, pnl, pnl_percent, f,
    strategy ?? existing.strategy, timeframe ?? existing.timeframe,
    entry_reason ?? existing.entry_reason, exit_reason ?? existing.exit_reason,
    review_notes ?? existing.review_notes, rating ?? existing.rating,
    tags ? JSON.stringify(tags) : existing.tags, screenshot_url ?? existing.screenshot_url,
    cs, req.params.id
  );

  const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
  res.json(trade);
});

// Delete trade
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Trade not found' });

  db.prepare('DELETE FROM trades WHERE id = ?').run(req.params.id);
  res.json({ message: 'Trade deleted' });
});

module.exports = router;
