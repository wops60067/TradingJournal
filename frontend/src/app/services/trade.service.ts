import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Trade, TradeForm, TradeStats } from '../models/trade.model';

@Injectable({
  providedIn: 'root'
})
export class TradeService {
  private baseUrl = window.location.origin;
  private apiUrl = `${this.baseUrl}/api/trades`;

  constructor(private http: HttpClient) {}

  getTrades(filters?: Record<string, string>): Observable<Trade[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params = params.set(key, value);
      });
    }
    return this.http.get<Trade[]>(this.apiUrl, { params });
  }

  getTrade(id: string): Observable<Trade> {
    return this.http.get<Trade>(`${this.apiUrl}/${id}`);
  }

  getStats(): Observable<TradeStats> {
    return this.http.get<TradeStats>(`${this.apiUrl}/stats`);
  }

  createTrade(trade: TradeForm): Observable<Trade> {
    return this.http.post<Trade>(this.apiUrl, trade);
  }

  updateTrade(id: string, trade: Partial<TradeForm>): Observable<Trade> {
    return this.http.put<Trade>(`${this.apiUrl}/${id}`, trade);
  }

  deleteTrade(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getEquityCurve(): Observable<{ date: string; pnl: number; cumulative: number }[]> {
    return this.http.get<{ date: string; pnl: number; cumulative: number }[]>(`${this.apiUrl}/equity-curve`);
  }

  uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return this.http.post<{ url: string }>(`${this.baseUrl}/api/upload`, formData);
  }

  getPrice(symbol: string): Observable<{ price: number | null; symbol: string }> {
    return this.http.get<{ price: number | null; symbol: string }>(`${this.baseUrl}/api/price/${encodeURIComponent(symbol)}`);
  }
}
