import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, mensagemErro } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { SemestreService } from '../core/semestre.service';
import { SemestreSelect } from './semestre-select';
import { Centro, DIAS, DIA_NOME, DiaSemana, Faixa, Horario } from '../core/models';

/** Coordenador cria o semestre e libera nele os dias (SEG a SAB) e faixas de horario para o seu centro. */
@Component({
  selector: 'app-horarios',
  imports: [FormsModule, SemestreSelect],
  template: `
    <div class="cabecalho">
      <h2>Dias e horários do semestre</h2>
      <button class="primario" (click)="salvar()" [disabled]="!centroId || !sem.selecionado()">Salvar</button>
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
    <app-semestre [podeCriar]="true" />

    @if (centroId && sem.selecionado()) {
      <p class="dica">Marque os horários liberados no semestre <strong>{{ sem.codigo() }}</strong> para os professores escolherem. Desmarcar um horário o <strong>inativa</strong>
        sem afetar os demais (o histórico é mantido).</p>
      <table class="grade-horarios">
        <thead><tr><th>Horário</th>@for (d of dias; track d) { <th>{{ diaNome[d] }}</th> }</tr></thead>
        <tbody>
          @for (f of faixas(); track f.id) {
            <tr>
              <th>{{ f.descricao }}</th>
              @for (d of dias; track d) {
                <td [class.marcado]="marcado(d, f.id)" (click)="alternar(d, f.id)">{{ marcado(d, f.id) ? '✔' : '' }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class HorariosPage {
  private api = inject(ApiService);
  auth = inject(AuthService);
  sem = inject(SemestreService);
  dias = DIAS;
  diaNome = DIA_NOME;
  ehAdmin = this.auth.tem('ADMINISTRADOR') && !this.auth.usuario()?.centroId;
  centroId: number | null = this.auth.usuario()?.centroId ?? null;
  centros = signal<Centro[]>([]);
  faixas = signal<Faixa[]>([]);
  selecao = signal<Set<string>>(new Set());
  erro = signal('');
  ok = signal('');

  constructor() {
    this.api.get<Faixa[]>('/horarios/faixas').then((r) => this.faixas.set(r)).catch((e) => this.erro.set(mensagemErro(e)));
    if (this.ehAdmin) this.api.get<Centro[]>('/centros').then((r) => this.centros.set(r));
    this.sem.carregar().catch((e) => this.erro.set(mensagemErro(e)));
    // recarrega a grade sempre que o semestre escolhido mudar
    effect(() => { this.sem.selecionado(); untracked(() => this.carregar()); });
  }

  private chave(d: DiaSemana, faixaId: number) { return d + '|' + faixaId; }

  marcado(d: DiaSemana, faixaId: number) { return this.selecao().has(this.chave(d, faixaId)); }

  alternar(d: DiaSemana, faixaId: number) {
    const s = new Set(this.selecao());
    const k = this.chave(d, faixaId);
    if (s.has(k)) s.delete(k); else s.add(k);
    this.selecao.set(s);
  }

  async carregar() {
    this.erro.set(''); this.ok.set('');
    this.selecao.set(new Set());
    if (!this.centroId || !this.sem.selecionado()) return;
    try {
      const hs = await this.api.get<Horario[]>('/horarios', { centroId: this.centroId, semestreId: this.sem.selecionado() });
      this.selecao.set(new Set(hs.filter((h) => h.status === 'ATIVO').map((h) => this.chave(h.dia, h.faixaId))));
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  async salvar() {
    this.erro.set(''); this.ok.set('');
    const celulas = this.dias.flatMap((dia) =>
      this.faixas().map((f) => ({ dia, faixaId: f.id, ativo: this.marcado(dia, f.id) })));
    try {
      await this.api.put('/horarios/grade', { centroId: this.centroId, semestreId: this.sem.selecionado(), celulas });
      await this.carregar();
      this.ok.set(`Dias e horários do semestre ${this.sem.codigo()} salvos.`);
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }
}
