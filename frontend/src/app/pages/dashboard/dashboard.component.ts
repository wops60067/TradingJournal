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
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('equityCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  stats: TradeStats | null = null;
  equityCurve: EquityPoint[] = [];
  loading = true;
  initialCapital = 100;
  private viewReady = false;

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

  ngAfterViewInit() {
    this.viewReady = true;
  }

  loadEquityCurve() {
    this.tradeService.getEquityCurve().subscribe({
      next: (data) => {
        this.equityCurve = data;
        // Wait for Angular to finish rendering, then draw
        this.scheduleDrawChart();
      }
    });
  }

  private scheduleDrawChart() {
    // Use requestAnimationFrame to ensure the DOM layout is complete
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.drawChart();
      });
    });
  }

  drawChart() {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || this.equityCurve.length === 0) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Safety: if canvas has no size yet, retry
    if (rect.width === 0 || rect.height === 0) {
      requestAnimationFrame(() => this.drawChart());
      return;
    }

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 20, right: 40, bottom: 40, left: 70 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    // Build data points: starting capital + each daily point
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
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#f5f5f5';
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
      ctx.fillStyle = '#a3a3a3';
      ctx.font = '11px Inter, system-ui';
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
      gradient.addColorStop(0, 'rgba(22, 163, 74, 0.15)');
      gradient.addColorStop(1, 'rgba(22, 163, 74, 0.01)');
    } else {
      gradient.addColorStop(0, 'rgba(220, 38, 38, 0.01)');
      gradient.addColorStop(1, 'rgba(220, 38, 38, 0.15)');
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
    ctx.strokeStyle = isPositive ? '#16a34a' : '#dc2626';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Draw dots on data points (skip if too many)
    if (points.length <= 50) {
      for (let i = 0; i < points.length; i++) {
        ctx.beginPath();
        ctx.arc(getX(i), getY(points[i].value), 3, 0, Math.PI * 2);
        ctx.fillStyle = isPositive ? '#16a34a' : '#dc2626';
        ctx.fill();
      }
    }

    // X-axis date labels (show a few)
    const datePoints = points.filter(p => p.date);
    const labelCount = Math.min(6, datePoints.length);
    const step = Math.max(1, Math.floor(datePoints.length / labelCount));
    ctx.fillStyle = '#a3a3a3';
    ctx.font = '11px Inter, system-ui';
    ctx.textAlign = 'center';
    for (let i = 0; i < datePoints.length; i += step) {
      const idx = i + 1;
      const x = getX(idx);
      // Shorten date: "2026-03-23" → "03/23"
      const d = datePoints[i].date;
      const short = d.length >= 10 ? d.substring(5).replace('-', '/') : d;
      ctx.fillText(short, x, h - pad.bottom + 20);
    }

    // Starting capital line (dashed)
    const capitalY = getY(this.initialCapital);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#d4d4d4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, capitalY);
    ctx.lineTo(w - pad.right, capitalY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#a3a3a3';
    ctx.textAlign = 'left';
    ctx.fillText(`初始: ${this.initialCapital.toLocaleString()}`, pad.left + 4, capitalY - 6);
  }
}
