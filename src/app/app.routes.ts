import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // LOGIN
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth-login/auth-login').then((m) => m.AuthLoginComponent),
  },

  // 2. RUTAS PRIVADAS: Envueltas en el DashboardLayout
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard-layout/dashboard-layout').then((m) => m.DashboardLayout),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('./features/home/home').then((m) => m.Home),
      },
      {
        path: 'ranking/:id',
        loadComponent: () => import('./features/ranking/ranking').then((m) => m.Ranking),
      },
      {
        path: 'fixtures',
        loadComponent: () => import('./features/calendar/calendar').then((m) => m.Calendar),
      },
      {
        path: 'squad/:id',
        loadComponent: () => import('./features/lineup/squad').then((m) => m.Squad),
      },
      {
        path: 'squad/:id/points',
        loadComponent: () =>
          import('./features/calendar-points/calendar-points').then((m) => m.CalendarPoints),
      },
      {
        path: 'Buyout-Clauses/:id',
        loadComponent: () =>
          import('./features/buyout-clauses/buyout-clauses').then((m) => m.BuyoutClauses),
      },
      {
        path: 'market/:id',
        loadComponent: () => import('./features/market/market').then((m) => m.Market),
      },
      {
        path: 'market/:id/offers',
        loadComponent: () =>
          import('./features/market-offers/market-offers').then((m) => m.MarketOffers),
      },
      {
        path: 'activities/:id',
        loadComponent: () => import('./features/activities/activities').then((m) => m.Activities),
      },
    ],
  },
  { path: '**', redirectTo: 'home' },
];
