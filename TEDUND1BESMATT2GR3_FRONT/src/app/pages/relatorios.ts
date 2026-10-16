import { Component, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, mensagemErro } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { SemestreService } from '../core/semestre.service';
import { SemestreSelect } from './semestre-select';
import { Centro, Curso, DIA_NOME, Docente, DocenteDisponibilidade, Horario, Ies, Relatorio } from '../core/models';

type Tipo = 'estrutura' | 'docentes' | 'horarios' | 'mapa-disponibilidade' | 'meu';
interface Estrutura { ies: Ies; centros: { centro: Centro; cursos: Curso[] }[]; }
interface DocentesCentro { centro: Centro; docentes: Docente[]; }

/** Relatorios por perfil, com identificacao de quem emitiu. */
@Component({
  selector: 'app-relatorios',
  imports: [FormsModule, DatePipe, SemestreSelect],
  template: `
    <div class="cabecalho"><h2>Relatórios</h2></div>
    @if (erro()) { <div class="alerta erro">{{ erro() }}</div> }

    <div class="filtros">
      @for (o of opcoes; track o.tipo) {
        <button [class.primario]="tipo() === o.tipo" [class.secundario]="tipo() !== o.tipo" (click)="emitir(o.tipo)">{{ o.texto }}</button>
      }
      @if (ehAdmin && (tipo() === 'horarios' || tipo() === 'mapa-disponibilidade')) {
        <select [(ngModel)]="centroId" (ngModelChange)="emitir(tipo()!)">
          <option [ngValue]="null" disabled>Centro</option>
          @for (c of centros(); track c.id) { <option [ngValue]="c.id">{{ c.sigla }}</option> }
        </select>
      }
    </div>
    @if (porSemestre(tipo())) { <app-semestre /> }

    @if (rel(); as r) {
      <section class="relatorio">
        <h2>{{ r.titulo }}</h2>
        <p class="emissao">Emitido por <strong>{{ r.emissao.emitidoPor }}</strong> ({{ r.emissao.login }})
          em {{ r.emissao.emitidoEm | date: 'dd/MM/yyyy HH:mm' }}</p>

        @switch (tipo()) {
          @case ('estrutura') {
            @for (e of $any(r.dados); track e.ies.id) {
              <h3>{{ e.ies.sigla }} — {{ e.ies.nome }} <small>[{{ e.ies.status }}]</small></h3>
              <p>Reitor(a): {{ e.ies.reitor }} · {{ e.ies.emailCentral }} · {{ e.ies.telefoneCentral }}</p>
              @for (c of e.centros; track c.centro.id) {
                <div class="bloco">
                  <strong>{{ c.centro.sigla }} — {{ c.centro.nome }}</strong> <small>[{{ c.centro.status }}] Coord.: {{ c.centro.coordenador }}</small>
                  <ul>@for (cu of c.cursos; track cu.id) { <li>{{ cu.sigla }} — {{ cu.descricao }} ({{ cu.turnos.join(', ') }}) [{{ cu.status }}]</li> } @empty { <li><em>sem cursos</em></li> }</ul>
                </div>
              } @empty { <p><em>sem centros acadêmicos</em></p> }
            }
          }
          @case ('docentes') {
            @for (c of $any(r.dados); track c.centro.id) {
              <h3>{{ c.centro.sigla }} — {{ c.centro.nome }} ({{ c.centro.iesSigla }})</h3>
              <table>
                <thead><tr><th>Matrícula</th><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Status</th></tr></thead>
                <tbody>
                  @for (d of c.docentes; track d.id) { <tr><td>{{ d.matricula }}</td><td>{{ d.nomeCompleto }}</td><td>{{ d.email }}</td><td>{{ d.telefone }}</td><td>{{ d.status }}</td></tr> }
                  @empty { <tr><td colspan="5"><em>sem professores</em></td></tr> }
                </tbody>
              </table>
            }
          }
          @case ('horarios') {
            <table>
              <thead><tr><th>Dia</th><th>Horário</th><th>Status</th></tr></thead>
              <tbody>@for (h of $any(r.dados); track h.id) { <tr><td>{{ dia(h.dia) }}</td><td>{{ h.faixa }}</td><td>{{ h.status }}</td></tr> }</tbody>
            </table>
          }
          @case ('mapa-disponibilidade') {
            @for (d of $any(r.dados); track d.docente.id) {
              <div class="bloco">
                <strong>{{ d.docente.nomeCompleto }}</strong> ({{ d.docente.matricula }})
                <p>Horários: @for (h of d.horarios; track h.id) { <span class="tag">{{ h.dia }} {{ h.faixa }}</span> } @empty { <em>não lançou</em> }</p>
                <p>Disciplinas: @for (i of d.interesses; track i.disciplinaId) { <span class="tag">{{ i.prioridade }} · {{ i.sigla }} - {{ i.descricao }}</span> } @empty { <em>não lançou</em> }</p>
              </div>
            }
          }
          @case ('meu') {
            <h3>Dias e horários</h3>
            <ul>@for (h of $any(r.dados).horarios; track h.id) { <li>{{ dia(h.dia) }} — {{ h.faixa }}</li> } @empty { <li><em>nenhum</em></li> }</ul>
            <h3>Disciplinas de interesse</h3>
            <table>
              <thead><tr><th>Prioridade</th><th>Sigla</th><th>Disciplina</th><th>Curso</th></tr></thead>
              <tbody>@for (i of $any(r.dados).interesses; track i.disciplinaId) { <tr><td>{{ i.prioridade }}</td><td>{{ i.sigla }}</td><td>{{ i.descricao }}</td><td>{{ i.cursoSigla }}</td></tr> }</tbody>
            </table>
          }
        }
      </section>
    }
  `,
})
export class RelatoriosPage {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  sem = inject(SemestreService);
  diaNome = DIA_NOME;
  ehAdmin = this.auth.tem('ADMINISTRADOR') && !this.auth.usuario()?.centroId;
  centroId: number | null = this.auth.usuario()?.centroId ?? null;
  centros = signal<Centro[]>([]);
  tipo = signal<Tipo | null>(null);
  rel = signal<Relatorio<unknown> | null>(null);
  erro = signal('');
  opcoes: { tipo: Tipo; texto: string }[] = [];

  constructor() {
    if (this.auth.tem('ADMINISTRADOR')) {
      this.opcoes.push({ tipo: 'estrutura', texto: 'Estrutura (IES, centros e cursos)' }, { tipo: 'docentes', texto: 'Professores por centro' });
      if (this.ehAdmin) this.api.get<Centro[]>('/centros').then((r) => this.centros.set(r));
    }
    if (this.auth.tem('COLABORADOR', 'ADMINISTRADOR')) {
      this.opcoes.push({ tipo: 'horarios', texto: 'Dias e horários' }, { tipo: 'mapa-disponibilidade', texto: 'Mapa de disponibilidade' });
    }
    if (this.auth.tem('USUARIO')) {
      this.opcoes.push({ tipo: 'meu', texto: 'Minha disponibilidade' });
    }
    this.sem.carregar().catch((e) => this.erro.set(mensagemErro(e)));
    // reemite o relatorio aberto quando o semestre muda
    effect(() => {
      this.sem.selecionado();
      untracked(() => { const t = this.tipo(); if (t && this.porSemestre(t)) this.emitir(t); });
    });
  }

  porSemestre(t: Tipo | null) { return t === 'horarios' || t === 'mapa-disponibilidade' || t === 'meu'; }

  async emitir(tipo: Tipo) {
    this.erro.set('');
    this.tipo.set(tipo);
    this.rel.set(null);
    const porCentro = tipo === 'horarios' || tipo === 'mapa-disponibilidade';
    if (porCentro && !this.centroId) { this.erro.set('Selecione o centro acadêmico.'); return; }
    const semestreId = this.sem.selecionado();
    if (this.porSemestre(tipo) && !semestreId) { this.erro.set('Nenhum semestre cadastrado.'); return; }
    try {
      const params = this.porSemestre(tipo) ? { centroId: porCentro ? this.centroId : null, semestreId } : undefined;
      this.rel.set(await this.api.get<Relatorio<unknown>>(`/relatorios/${tipo}`, params));
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  dia(d: string) { return (this.diaNome as Record<string, string>)[d] ?? d; }
}

// tipos usados so para documentar o formato dos dados de cada relatorio
export type _Tipos = Estrutura | DocentesCentro | Horario | DocenteDisponibilidade;
