import { Routes } from '@angular/router';

// Phase 1: Player view components will be added here
export const PLAYER_VIEW_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./player-view-placeholder/player-view-placeholder.component').then(m => m.PlayerViewPlaceholderComponent),
  },
];
