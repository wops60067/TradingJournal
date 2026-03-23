const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const tradesRouter = require('./routes/trades');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Image upload configuration
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  }
});

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// Yahoo Finance symbol mapping
const YAHOO_SYMBOL_MAP = {
  'XAUUSD': 'GC=F',       // Gold futures
  'XAGUSD': 'SI=F',       // Silver futures
  'BTCUSDT': 'BTC-USD',
  'BTCUSD': 'BTC-USD',
  'ETHUSDT': 'ETH-USD',
  'ETHUSD': 'ETH-USD',
};

function toYahooSymbol(symbol) {
  const s = symbol.toUpperCase().replace('/', '');
  if (YAHOO_SYMBOL_MAP[s]) return YAHOO_SYMBOL_MAP[s];
  // Forex pairs: EURUSD -> EURUSD=X
  return `${s}=X`;
}

// Fetch current price for a symbol
app.get('/api/price/:symbol', async (req, res) => {
  // Disable caching so price is always fresh
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  try {
    const yahooSymbol = toYahooSymbol(req.params.symbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (meta && meta.regularMarketPrice) {
      res.json({ price: meta.regularMarketPrice, symbol: req.params.symbol });
    } else {
      res.json({ price: null, symbol: req.params.symbol });
    }
  } catch (e) {
    res.json({ price: null, symbol: req.params.symbol });
  }
});

// API routes
app.use('/api/trades', tradesRouter);

// Serve Angular frontend in production
app.use(express.static(path.join(__dirname, '../frontend/dist/frontend/browser')));
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/frontend/browser/index.html'));
});

app.listen(PORT, () => {
  console.log(`Trading Journal API running on http://localhost:${PORT}`);
});
