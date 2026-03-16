import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 't/smetankovich'
  },
  {
    path: 't/:slug',
    loadComponent: () =>
      import('./tenant/tenant-shell.component').then((module) => module.TenantShellComponent)
  },
  {
    path: '**',
    redirectTo: 't/smetankovich'
  }
];
