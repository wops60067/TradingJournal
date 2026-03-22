import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TradeService } from '../../services/trade.service';
import { Trade } from '../../models/trade.model';

@Component({
  selector: 'app-trade-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './trade-list.component.html',
  styleUrl: './trade-list.component.scss'
})
export class TradeListComponent implements OnInit {
  trades: Trade[] = [];
  loading = true;

  // Filters
  filterStatus = '';
  filterSymbol = '';
  filterDirection = '';

  constructor(private tradeService: TradeService) {}

  ngOnInit() {
    this.loadTrades();
  }

  loadTrades() {
    this.loading = true;
    const filters: Record<string, string> = {};
    if (this.filterStatus) filters['status'] = this.filterStatus;
    if (this.filterSymbol) filters['symbol'] = this.filterSymbol;
    if (this.filterDirection) filters['direction'] = this.filterDirection;

    this.tradeService.getTrades(filters).subscribe({
      next: (trades) => {
        this.trades = trades;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  deleteTrade(id: string, event: Event) {
    event.stopPropagation();
    if (confirm('確定要刪除這筆交易嗎？')) {
      this.tradeService.deleteTrade(id).subscribe(() => this.loadTrades());
    }
  }

  clearFilters() {
    this.filterStatus = '';
    this.filterSymbol = '';
    this.filterDirection = '';
    this.loadTrades();
  }
}
