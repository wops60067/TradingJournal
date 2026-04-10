import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TradeService } from '../../services/trade.service';
import { TradeForm } from '../../models/trade.model';

// Default contract sizes per symbol for CFD
const CONTRACT_SIZES: Record<string, number> = {
  'XAU/USD': 100,
  'XAG/USD': 5000,
  'GBP/JPY': 100000,
  'EUR/USD': 100000,
  'USD/JPY': 100000,
  'GBP/USD': 100000,
  'EUR/JPY': 100000,
  'AUD/USD': 100000,
  'NZD/USD': 100000,
  'USD/CHF': 100000,
  'USD/CAD': 100000,
  'BTC/USDT': 1,
  'ETH/USDT': 1,
};

@Component({
  selector: 'app-trade-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './trade-form.component.html',
  styleUrl: './trade-form.component.scss'
})
export class TradeFormComponent implements OnInit {
  isEdit = false;
  tradeId: string | null = null;
  saving = false;
  uploading = false;
  imagePreview: string | null = null;
  fetchingPrice = false;

  today = new Date().toISOString().split('T')[0];

  form: TradeForm = {
    symbol: '',
    direction: 'long',
    entry_price: 0,
    exit_price: null,
    quantity: 0,
    contract_size: 1,
    entry_date: this.today,
    exit_date: this.today,
    fees: 0,
    timeframe: '',
    entry_reason: '',
    exit_reason: '',
    review_notes: '',
    rating: undefined,
    tags: [],
    screenshot_url: ''
  };

  customSymbol = '';
  useCustomSymbol = false;

  tagInput = '';

  symbols = ['XAU/USD', 'GBP/JPY', 'EUR/USD', 'USD/JPY', 'GBP/USD', 'EUR/JPY', 'AUD/USD', 'BTC/USDT', 'ETH/USDT'];
  timeframes = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'];

  constructor(
    private tradeService: TradeService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.tradeId = id;
      this.tradeService.getTrade(id).subscribe(trade => {
        this.form = {
          symbol: trade.symbol,
          direction: trade.direction,
          entry_price: trade.entry_price,
          exit_price: trade.exit_price,
          quantity: trade.quantity,
          contract_size: trade.contract_size || 1,
          entry_date: trade.entry_date,
          exit_date: trade.exit_date,
          fees: trade.fees,
          timeframe: trade.timeframe || '',
          entry_reason: trade.entry_reason || '',
          exit_reason: trade.exit_reason || '',
          review_notes: trade.review_notes || '',
          rating: trade.rating || undefined,
          tags: trade.tags ? JSON.parse(trade.tags) : [],
          screenshot_url: trade.screenshot_url || ''
        };
        if (!this.symbols.includes(trade.symbol)) {
          this.useCustomSymbol = true;
          this.customSymbol = trade.symbol;
          this.form.symbol = '__custom__';
        }
        if (trade.screenshot_url) {
          this.imagePreview = trade.screenshot_url.startsWith('/')
            ? `${window.location.origin}${trade.screenshot_url}`
            : trade.screenshot_url;
        }
      });
    }
  }

  onSymbolChange() {
    if (this.form.symbol === '__custom__') {
      this.useCustomSymbol = true;
      this.form.contract_size = 1;
    } else {
      this.useCustomSymbol = false;
      this.customSymbol = '';
      this.form.contract_size = CONTRACT_SIZES[this.form.symbol] || 1;
      if (this.form.symbol && !this.isEdit) {
        this.fetchPrice(this.form.symbol);
      }
    }
  }

  fetchPrice(symbol: string) {
    this.fetchingPrice = true;
    this.tradeService.getPrice(symbol).subscribe({
      next: (res) => {
        if (res.price != null) {
          this.form.entry_price = res.price;
          this.form.exit_price = res.price;
        }
        this.fetchingPrice = false;
      },
      error: () => this.fetchingPrice = false
    });
  }

  onCustomSymbolBlur() {
    const sym = this.customSymbol.trim().toUpperCase();
    if (sym) {
      this.form.contract_size = CONTRACT_SIZES[sym] || 1;
      if (!this.isEdit) {
        this.fetchPrice(sym);
      }
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading = true;
    const reader = new FileReader();
    reader.onload = () => this.imagePreview = reader.result as string;
    reader.readAsDataURL(file);

    this.tradeService.uploadImage(file).subscribe({
      next: (res) => {
        this.form.screenshot_url = res.url;
        this.uploading = false;
      },
      error: () => {
        this.uploading = false;
        this.imagePreview = null;
      }
    });
  }

  removeImage() {
    this.form.screenshot_url = '';
    this.imagePreview = null;
  }

  addTag() {
    const tag = this.tagInput.trim();
    if (tag && !this.form.tags?.includes(tag)) {
      this.form.tags = [...(this.form.tags || []), tag];
    }
    this.tagInput = '';
  }

  removeTag(tag: string) {
    this.form.tags = this.form.tags?.filter(t => t !== tag);
  }

  onSubmit() {
    this.saving = true;
    const payload = { ...this.form };

    if (this.useCustomSymbol && this.customSymbol.trim()) {
      payload.symbol = this.customSymbol.trim().toUpperCase();
    }

    if (this.isEdit && this.tradeId) {
      this.tradeService.updateTrade(this.tradeId, payload).subscribe({
        next: () => this.router.navigate(['/trades', this.tradeId]),
        error: () => this.saving = false
      });
    } else {
      this.tradeService.createTrade(payload).subscribe({
        next: (trade) => this.router.navigate(['/trades', trade.id]),
        error: () => this.saving = false
      });
    }
  }
}
