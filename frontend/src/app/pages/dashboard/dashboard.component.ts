import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TradeService } from '../../services/trade.service';
import { TradeStats, EquityPoint } from '../../models/trade.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  @ViewChild('equityCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  stats: TradeStats | null = null;
  equityCurve: EquityPoint[] = [];
  loading = true;
  initialCapital = 10000;

  constructor(private tradeService: TradeService) {}

  ngOnInit() {
    this.tradeService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loading = false;
        this.loadEquityCurve();
      },
      error: () => this.loading = false
    });
  }

  loadEquityCurve() {
    this.tradeService.getEquityCurve().subscribe({
      next: (data) => {
        this.equityCurve = data;
        setTimeout(() => this.drawChart(), 0);
      }
    });
  }

  onCapitalChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.initialCapital = parseFloat(value) || 0;
    this.drawChart();
  }

  drawChart() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || this.equityCurve.length === 0) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 70 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    // Build data points: starting capital + each trade
    const points = [
      { date: '', value: this.initialCapital },
      ...this.equityCurve.map(p => ({ date: p.date, value: this.initialCapital + p.cumulative }))
    ];

    const values = points.map(p => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();

      // Y-axis labels
      const val = maxVal - (range / gridLines) * i;
      ctx.fillStyle = '#999';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(0), pad.left - 8, y + 4);
    }

    // Draw the equity line
    const getX = (i: number) => pad.left + (i / (points.length - 1)) * chartW;
    const getY = (v: number) => pad.top + chartH - ((v - minVal) / range) * chartH;

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    const lastValue = points[points.length - 1].value;
    const isPositive = lastValue >= this.initialCapital;
    if (isPositive) {
      gradient.addColorStop(0, 'rgba(6, 214, 160, 0.3)');
      gradient.addColorStop(1, 'rgba(6, 214, 160, 0.02)');
    } else {
      gradient.addColorStop(0, 'rgba(239, 71, 111, 0.02)');
      gradient.addColorStop(1, 'rgba(239, 71, 111, 0.3)');
    }

    // Fill area
    ctx.beginPath();
    ctx.moveTo(getX(0), pad.top + chartH);
    for (let i = 0; i < points.length; i++) {
      ctx.lineTo(getX(i), getY(points[i].value));
    }
    ctx.lineTo(getX(points.length - 1), pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(points[0].value));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(getX(i), getY(points[i].value));
    }
    ctx.strokeStyle = isPositive ? '#06d6a0' : '#ef476f';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Draw dots on data points (skip if too many)
    if (points.length <= 50) {
      for (let i = 0; i < points.length; i++) {
        ctx.beginPath();
        ctx.arc(getX(i), getY(points[i].value), 3, 0, Math.PI * 2);
        ctx.fillStyle = isPositive ? '#06d6a0' : '#ef476f';
        ctx.fill();
      }
    }

    // X-axis date labels (show a few)
    const datePoints = points.filter(p => p.date);
    const labelCount = Math.min(6, datePoints.length);
    const step = Math.max(1, Math.floor(datePoints.length / labelCount));
    ctx.fillStyle = '#999';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    for (let i = 0; i < datePoints.length; i += step) {
      const idx = i + 1; // +1 because first point is the initial capital with no date
      const x = getX(idx);
      ctx.fillText(datePoints[i].date, x, h - pad.bottom + 20);
    }

    // Starting capital line (dashed)
    const capitalY = getY(this.initialCapital);
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, capitalY);
    ctx.lineTo(w - pad.right, capitalY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'left';
    ctx.fillText(`初始: ${this.initialCapital.toLocaleString()}`, pad.left + 4, capitalY - 6);
  }
}
