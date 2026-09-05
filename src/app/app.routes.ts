import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'landing',
    loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: 'join/:code',
    loadComponent: () => import('./features/campaigns/join/join.component').then(m => m.JoinComponent),
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell.component').then(m => m.ShellComponent),
    children: [
      {
        path: 'campaigns',
        loadChildren: () => import('./features/campaigns/campaigns.routes').then(m => m.CAMPAIGNS_ROUTES),
      },
      {
        path: 'player',
        loadChildren: () => import('./features/player-view/player-view.routes').then(m => m.PLAYER_VIEW_ROUTES),
      },
      { path: '', redirectTo: 'campaigns', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'campaigns' },
];
