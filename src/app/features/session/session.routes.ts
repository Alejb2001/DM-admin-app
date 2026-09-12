import { Routes } from '@angular/router';

export const SESSION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./session-history/session-history.component').then(m => m.SessionHistoryComponent),
  },
  {
    path: ':sid',
    loadComponent: () =>
      import('./session-room/session-room.component').then(m => m.SessionRoomComponent),
  },
];
