import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { PERFIL_NOME, Perfil } from '../core/models';

interface ItemMenu { rota: string; texto: string; perfis: Perfil[]; }

/** Moldura das telas: cabecalho e menu mostrando so o que o perfil pode acessar. */
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topo">
      <div class="marca">Disponibilidade Docente</div>
      <div class="usuario">
        <span>{{ auth.usuario()?.nome }}</span>
        <small>{{ perfis() }}</small>
        <button class="link" (click)="auth.sair()">Sair</button>
      </div>
    </header>
    <div class="corpo">
      <nav class="menu">
        @for (grupo of grupos(); track grupo.titulo) {
          <div class="grupo">{{ grupo.titulo }}</div>
          @for (item of grupo.itens; track item.rota) {
            <a [routerLink]="item.rota" routerLinkActive="ativo">{{ item.texto }}</a>
          }
        }
      </nav>
      <main class="conteudo"><router-outlet /></main>
    </div>
  `,
})
export class Layout {
  auth = inject(AuthService);

  private menu: { titulo: string; itens: ItemMenu[] }[] = [
    {
      titulo: 'Administração',
      itens: [
        { rota: '/ies', texto: 'Faculdades (IES)', perfis: ['ADMINISTRADOR'] },
        { rota: '/centros', texto: 'Centros Acadêmicos', perfis: ['ADMINISTRADOR'] },
        { rota: '/cursos', texto: 'Cursos', perfis: ['ADMINISTRADOR'] },
        { rota: '/docentes', texto: 'Professores', perfis: ['ADMINISTRADOR'] },
        { rota: '/auditoria', texto: 'Histórico de ações', perfis: ['ADMINISTRADOR'] },
      ],
    },
    {
      titulo: 'Coordenação',
      itens: [
        { rota: '/horarios', texto: 'Dias e horários', perfis: ['COLABORADOR', 'ADMINISTRADOR'] },
        { rota: '/disciplinas', texto: 'Disciplinas', perfis: ['COLABORADOR', 'ADMINISTRADOR'] },
        { rota: '/mapa', texto: 'Mapa final', perfis: ['COLABORADOR', 'ADMINISTRADOR'] },
      ],
    },
    {
      titulo: 'Professor',
      itens: [
        { rota: '/minha-disponibilidade', texto: 'Minha disponibilidade', perfis: ['USUARIO'] },
        { rota: '/meus-interesses', texto: 'Disciplinas de interesse', perfis: ['USUARIO'] },
      ],
    },
    { titulo: 'Geral', itens: [{ rota: '/relatorios', texto: 'Relatórios', perfis: [] }] },
  ];

  grupos = computed(() => {
    this.auth.usuario();
    return this.menu
      .map((g) => ({ ...g, itens: g.itens.filter((i) => i.perfis.length === 0 || this.auth.tem(...i.perfis)) }))
      .filter((g) => g.itens.length > 0);
  });

  perfis = computed(() => (this.auth.usuario()?.perfis ?? []).map((p) => PERFIL_NOME[p]).join(' · '));
}
