import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TradeService } from '../../services/trade.service';
import { TradeForm } from '../../models/trade.model';

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

  form: TradeForm = {
    symbol: '',
    direction: 'long',
    entry_price: 0,
    exit_price: null,
    quantity: 0,
    entry_date: new Date().toISOString().split('T')[0],
    exit_date: null,
    fees: 0,
    strategy: '',
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
  strategies = ['趨勢跟蹤', '突破', '回調', '均值回歸', '動量', '套利', '波段', '日內', '剝頭皮', '其他'];
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
          entry_date: trade.entry_date,
          exit_date: trade.exit_date,
          fees: trade.fees,
          strategy: trade.strategy || '',
          timeframe: trade.timeframe || '',
          entry_reason: trade.entry_reason || '',
          exit_reason: trade.exit_reason || '',
          review_notes: trade.review_notes || '',
          rating: trade.rating || undefined,
          tags: trade.tags ? JSON.parse(trade.tags) : [],
          screenshot_url: trade.screenshot_url || ''
        };
        // Check if symbol is in preset list
        if (!this.symbols.includes(trade.symbol)) {
          this.useCustomSymbol = true;
          this.customSymbol = trade.symbol;
          this.form.symbol = '__custom__';
        }
        // Set image preview
        if (trade.screenshot_url) {
          this.imagePreview = trade.screenshot_url.startsWith('/')
            ? `http://localhost:3000${trade.screenshot_url}`
            : trade.screenshot_url;
        }
      });
    }
  }

  onSymbolChange() {
    if (this.form.symbol === '__custom__') {
      this.useCustomSymbol = true;
    } else {
      this.useCustomSymbol = false;
      this.customSymbol = '';
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading = true;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = () => this.imagePreview = reader.result as string;
    reader.readAsDataURL(file);

    // Upload to server
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

    // Resolve actual symbol
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
