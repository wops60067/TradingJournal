import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TradeService } from '../../services/trade.service';
import { Trade } from '../../models/trade.model';

@Component({
  selector: 'app-trade-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './trade-detail.component.html',
  styleUrl: './trade-detail.component.scss'
})
export class TradeDetailComponent implements OnInit {
  trade: Trade | null = null;
  loading = true;
  editingNotes = false;
  reviewNotes = '';

  constructor(
    private tradeService: TradeService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.tradeService.getTrade(id).subscribe({
        next: (trade) => {
          this.trade = trade;
          this.reviewNotes = trade.review_notes || '';
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.router.navigate(['/trades']);
        }
      });
    }
  }

  get parsedTags(): string[] {
    if (!this.trade?.tags) return [];
    try { return JSON.parse(this.trade.tags); } catch { return []; }
  }

  saveNotes() {
    if (!this.trade) return;
    this.tradeService.updateTrade(this.trade.id, { review_notes: this.reviewNotes }).subscribe(updated => {
      this.trade = updated;
      this.editingNotes = false;
    });
  }

  deleteTrade() {
    if (!this.trade || !confirm('確定要刪除這筆交易嗎？')) return;
    this.tradeService.deleteTrade(this.trade.id).subscribe(() => this.router.navigate(['/trades']));
  }
}
