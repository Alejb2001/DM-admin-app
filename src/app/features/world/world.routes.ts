import { Routes } from '@angular/router';

export const WORLD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./entity-list/entity-list.component').then(m => m.EntityListComponent),
  },
  {
    path: 'graph',
    loadComponent: () => import('./graph/graph.component').then(m => m.GraphComponent),
  },
  {
    path: ':entityId',
    loadComponent: () => import('./entity-detail/entity-detail.component').then(m => m.EntityDetailComponent),
  },
];
