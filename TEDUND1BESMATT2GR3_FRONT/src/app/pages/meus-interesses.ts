import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, mensagemErro } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { SemestreService } from '../core/semestre.service';
import { SemestreSelect } from './semestre-select';
import { Disciplina, Interesse } from '../core/models';

/** O professor indica as disciplinas que quer lecionar com prioridade de 1 (maior interesse) a 5 (menor). */
@Component({
  selector: 'app-meus-interesses',
  imports: [FormsModule, SemestreSelect],
  template: `
    <div class="cabecalho">
      <h2>Disciplinas de interesse</h2>
      <button class="primario" (click)="salvar()" [disabled]="!sem.selecionado()">Salvar</button>
    </div>
    @if (erro()) { <div class="alerta erro">{{ erro() }}</div> }
    @if (ok()) { <div class="alerta ok">{{ ok() }}</div> }
    <app-semestre />
    <p class="dica">Escolha a prioridade de cada disciplina que você quer lecionar no semestre <strong>{{ sem.codigo() }}</strong>:
      <strong>1 = maior interesse</strong> e <strong>5 = menor interesse</strong>. Deixe "—" nas que não quer.</p>

    <table>
      <thead><tr><th>Sigla</th><th>Disciplina</th><th>Curso</th><th>CH</th><th>Prioridade</th></tr></thead>
      <tbody>
        @for (d of disciplinas(); track d.id) {
          <tr>
            <td><strong>{{ d.sigla }}</strong></td><td>{{ d.descricao }}</td><td>{{ d.cursoSigla }}</td><td>{{ d.cargaHoraria }}h</td>
            <td>
              <select [(ngModel)]="prioridades[d.id]">
                <option [ngValue]="0">—</option>
                @for (p of [1, 2, 3, 4, 5]; track p) { <option [ngValue]="p">{{ p }}</option> }
              </select>
            </td>
          </tr>
        } @empty { <tr><td colspan="5" class="vazio">Nenhuma disciplina ativa no seu centro.</td></tr> }
      </tbody>
    </table>
  `,
})
export class MeusInteressesPage {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  sem = inject(SemestreService);
  disciplinas = signal<Disciplina[]>([]);
  prioridades: Record<number, number> = {};
  erro = signal('');
  ok = signal('');

  constructor() {
    this.sem.carregar().catch((e) => this.erro.set(mensagemErro(e)));
    effect(() => { this.sem.selecionado(); untracked(() => this.carregar()); });
  }

  async carregar() {
    this.erro.set(''); this.ok.set('');
    const semestreId = this.sem.selecionado();
    if (!semestreId) { this.disciplinas.set([]); return; }
    try {
      const [disciplinas, meus] = await Promise.all([
        this.api.get<Disciplina[]>('/disciplinas', { centroId: this.auth.usuario()?.centroId, somenteAtivas: true }),
        this.api.get<Interesse[]>('/meu/interesses', { semestreId }),
      ]);
      const p: Record<number, number> = {};
      disciplinas.forEach((d) => (p[d.id] = 0));
      meus.forEach((i) => (p[i.disciplinaId] = i.prioridade));
      this.prioridades = p;
      this.disciplinas.set(disciplinas);
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  async salvar() {
    this.erro.set(''); this.ok.set('');
    const itens = Object.entries(this.prioridades)
      .filter(([, p]) => p >= 1 && p <= 5)
      .map(([id, prioridade]) => ({ disciplinaId: Number(id), prioridade }));
    try {
      await this.api.put('/meu/interesses', { semestreId: this.sem.selecionado(), itens });
      this.ok.set(`${itens.length} disciplina(s) de interesse salva(s) para o semestre ${this.sem.codigo()}.`);
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }
}
