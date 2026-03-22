import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'trades',
    loadComponent: () => import('./pages/trade-list/trade-list.component').then(m => m.TradeListComponent)
  },
  {
    path: 'trades/new',
    loadComponent: () => import('./pages/trade-form/trade-form.component').then(m => m.TradeFormComponent)
  },
  {
    path: 'trades/:id',
    loadComponent: () => import('./pages/trade-detail/trade-detail.component').then(m => m.TradeDetailComponent)
  },
  {
    path: 'trades/:id/edit',
    loadComponent: () => import('./pages/trade-form/trade-form.component').then(m => m.TradeFormComponent)
  }
];
