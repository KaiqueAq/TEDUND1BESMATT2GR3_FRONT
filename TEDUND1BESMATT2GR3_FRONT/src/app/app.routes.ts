import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthService } from './core/auth.service';
import { authGuard } from './core/auth.guard';
import { Layout } from './pages/layout';
import { LoginPage } from './pages/login';
import { IesPage } from './pages/ies';
import { CentrosPage } from './pages/centros';
import { CursosPage } from './pages/cursos';
import { DocentesPage } from './pages/docentes';
import { HorariosPage } from './pages/horarios';
import { DisciplinasPage } from './pages/disciplinas';
import { MinhaDisponibilidadePage } from './pages/minha-disponibilidade';
import { MeusInteressesPage } from './pages/meus-interesses';
import { MapaPage } from './pages/mapa';
import { AuditoriaPage } from './pages/auditoria';
import { RelatoriosPage } from './pages/relatorios';

const ADM = { perfis: ['ADMINISTRADOR'] };
const COORD = { perfis: ['COLABORADOR', 'ADMINISTRADOR'] };
const PROF = { perfis: ['USUARIO'] };

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: 'ies', component: IesPage, canActivate: [authGuard], data: ADM },
      { path: 'centros', component: CentrosPage, canActivate: [authGuard], data: ADM },
      { path: 'cursos', component: CursosPage, canActivate: [authGuard], data: ADM },
      { path: 'docentes', component: DocentesPage, canActivate: [authGuard], data: ADM },
      { path: 'auditoria', component: AuditoriaPage, canActivate: [authGuard], data: ADM },
      { path: 'horarios', component: HorariosPage, canActivate: [authGuard], data: COORD },
      { path: 'disciplinas', component: DisciplinasPage, canActivate: [authGuard], data: COORD },
      { path: 'mapa', component: MapaPage, canActivate: [authGuard], data: COORD },
      { path: 'minha-disponibilidade', component: MinhaDisponibilidadePage, canActivate: [authGuard], data: PROF },
      { path: 'meus-interesses', component: MeusInteressesPage, canActivate: [authGuard], data: PROF },
      { path: 'relatorios', component: RelatoriosPage },
      { path: '', pathMatch: 'full', redirectTo: () => inject(AuthService).rotaInicial() },
    ],
  },
  { path: '**', redirectTo: '' },
];
