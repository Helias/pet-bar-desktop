import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'pet', loadComponent: () => import('./pet/pet').then((m) => m.Pet) },
  { path: 'ask', loadComponent: () => import('./ask/ask').then((m) => m.Ask) },
  { path: 'settings', loadComponent: () => import('./settings/settings').then((m) => m.Settings) },
  { path: '**', redirectTo: 'pet' },
];
