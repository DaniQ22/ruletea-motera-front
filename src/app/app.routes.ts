import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'miembros',
    loadComponent: () =>
      import('./pages/miembros/miembros.component').then(
        (m) => m.MiembrosComponent,
      ),
  },
  {
    path: 'ruleta',
    loadComponent: () =>
      import('./pages/ruleta/ruleta.component').then(
        (m) => m.RuletaComponent,
      ),
  },
  { path: '**', redirectTo: '' },
];
