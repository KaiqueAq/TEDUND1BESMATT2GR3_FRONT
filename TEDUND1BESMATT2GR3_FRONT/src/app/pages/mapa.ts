import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, mensagemErro } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { SemestreService } from '../core/semestre.service';
import { SemestreSelect } from './semestre-select';
import { Centro, DIAS, DIA_NOME, Disciplina, DocenteDisponibilidade, MapaItem } from '../core/models';

interface ItemForm { id: number | null; docenteId: number | null; disciplinaId: number | null; horarioId: number | null; }

/** Coordenador monta o mapa final: professor x disciplina x dia/horario, com base no que os professores lancaram. */
@Component({
  selector: 'app-mapa',
  imports: [FormsModule, SemestreSelect],
  template: `
    <div class="cabecalho">
      <h2>Mapa final de aulas</h2>
      @if (centroId && sem.selecionado()) { <button class="primario" (click)="novo()">+ Adicionar aula</button> }
    </div>
    @if (erro()) { <div class="alerta erro">{{ erro() }}</div> }
    @if (ok()) { <div class="alerta ok">{{ ok() }}</div> }

    @if (ehAdmin) {
      <div class="filtros">
        <label>Centro acadêmico
          <select [(ngModel)]="centroId" (ngModelChange)="carregar()">
            <option [ngValue]="null" disabled>Selecione</option>
            @for (c of centros(); track c.id) { <option [ngValue]="c.id">{{ c.sigla }} ({{ c.iesSigla }})</option> }
          </select>
        </label>
      </div>
    } @else {
      <p class="sub">Centro: <strong>{{ auth.usuario()?.centroSigla }}</strong></p>
    }
    <app-semestre />

    @if (form(); as f) {
      <form class="painel" (ngSubmit)="salvar(f)">
        <h3>{{ f.id ? 'Editar aula' : 'Adicionar aula' }}</h3>
        <div class="grade3">
          <label>Professor *
            <select name="doc" [(ngModel)]="f.docenteId" (ngModelChange)="f.horarioId = null" required>
              <option [ngValue]="null" disabled>Selecione</option>
              @for (e of escolhas(); track e.docente.id) { <option [ngValue]="e.docente.id">{{ e.docente.nomeCompleto }}</option> }
            </select>
          </label>
          <label>Dia e horário * <small>(só os que o professor marcou)</small>
            <select name="hor" [(ngModel)]="f.horarioId" required [disabled]="!f.docenteId">
              <option [ngValue]="null" disabled>Selecione</option>
              @for (h of horariosDo(f.docenteId); track h.id) { <option [ngValue]="h.id">{{ diaNome[h.dia] }} {{ h.faixa }}</option> }
            </select>
          </label>
          <label>Disciplina *
            <select name="disc" [(ngModel)]="f.disciplinaId" required>
              <option [ngValue]="null" disabled>Selecione</option>
              @for (d of disciplinas(); track d.id) { <option [ngValue]="d.id">{{ d.sigla }} - {{ d.descricao }}</option> }
            </select>
          </label>
        </div>
        <div class="acoes">
          <button type="button" class="secundario" (click)="form.set(null)">Cancelar</button>
          <button type="submit" class="primario">Salvar</button>
        </div>
      </form>
    }

    @if (centroId && sem.selecionado()) {
      <table>
        <thead><tr><th>Dia</th><th>Horário</th><th>Professor</th><th>Disciplina</th><th>Status</th><th></th></tr></thead>
        <tbody>
          @for (m of mapaOrdenado(); track m.id) {
            <tr [class.inativo]="m.status === 'INATIVO'">
              <td>{{ diaNome[m.dia] }}</td><td>{{ m.faixa }}</td><td>{{ m.docenteNome }}</td><td>{{ m.disciplina }}</td>
              <td><span class="status" [class.off]="m.status === 'INATIVO'">{{ m.status }}</span></td>
              <td class="botoes">
                @if (m.status === 'ATIVO') {
                  <button class="link" (click)="editar(m)">Editar</button>
                  <button class="link" (click)="inativar(m)">Inativar</button>
                }
              </td>
            </tr>
          } @empty { <tr><td colspan="6" class="vazio">Nenhuma aula lançada ainda.</td></tr> }
        </tbody>
      </table>
    }
  `,
})
export class MapaPage {
  private api = inject(ApiService);
  auth = inject(AuthService);
  sem = inject(SemestreService);
  diaNome = DIA_NOME;
  ehAdmin = this.auth.tem('ADMINISTRADOR') && !this.auth.usuario()?.centroId;
  centroId: number | null = this.auth.usuario()?.centroId ?? null;
  centros = signal<Centro[]>([]);
  escolhas = signal<DocenteDisponibilidade[]>([]);
  disciplinas = signal<Disciplina[]>([]);
  mapa = signal<MapaItem[]>([]);
  form = signal<ItemForm | null>(null);
  erro = signal('');
  ok = signal('');

  mapaOrdenado = computed(() =>
    [...this.mapa()].sort((a, b) => DIAS.indexOf(a.dia) - DIAS.indexOf(b.dia) || a.ordem - b.ordem));

  constructor() {
    if (this.ehAdmin) this.api.get<Centro[]>('/centros').then((r) => this.centros.set(r));
    this.sem.carregar().catch((e) => this.erro.set(mensagemErro(e)));
    effect(() => { this.sem.selecionado(); untracked(() => this.carregar()); });
  }

  async carregar() {
    this.form.set(null);
    const semestreId = this.sem.selecionado();
    if (!this.centroId || !semestreId) { this.mapa.set([]); this.escolhas.set([]); return; }
    try {
      const [escolhas, disciplinas, mapa] = await Promise.all([
        this.api.get<DocenteDisponibilidade[]>('/mapa/escolhas', { centroId: this.centroId, semestreId }),
        this.api.get<Disciplina[]>('/disciplinas', { centroId: this.centroId, somenteAtivas: true }),
        this.api.get<MapaItem[]>('/mapa', { centroId: this.centroId, semestreId }),
      ]);
      this.escolhas.set(escolhas);
      this.disciplinas.set(disciplinas);
      this.mapa.set(mapa);
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  /** O professor so pode ser alocado nos dias/horarios que ele marcou. */
  horariosDo(docenteId: number | null) {
    return this.escolhas().find((e) => e.docente.id === docenteId)?.horarios ?? [];
  }

  novo() { this.form.set({ id: null, docenteId: null, disciplinaId: null, horarioId: null }); }

  editar(m: MapaItem) { this.form.set({ id: m.id, docenteId: m.docenteId, disciplinaId: m.disciplinaId, horarioId: m.horarioId }); }

  async salvar(f: ItemForm) {
    this.erro.set(''); this.ok.set('');
    try {
      if (f.id) await this.api.put(`/mapa/${f.id}`, f); else await this.api.post('/mapa', f);
      this.ok.set('Aula salva no mapa.');
      this.form.set(null);
      await this.carregar();
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  async inativar(m: MapaItem) {
    this.erro.set(''); this.ok.set('');
    try {
      await this.api.patch(`/mapa/${m.id}/inativar`);
      await this.carregar();
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }
}
