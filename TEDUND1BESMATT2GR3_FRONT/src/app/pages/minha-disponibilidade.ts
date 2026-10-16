import { Component, effect, inject, signal, untracked } from '@angular/core';
import { ApiService, mensagemErro } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { SemestreService } from '../core/semestre.service';
import { SemestreSelect } from './semestre-select';
import { DIAS, DIA_NOME, DiaSemana, Faixa, Horario } from '../core/models';

/** O professor marca os dias/horarios em que pode dar aula, limitado ao que o coordenador liberou. */
@Component({
  selector: 'app-minha-disponibilidade',
  imports: [SemestreSelect],
  template: `
    <div class="cabecalho">
      <h2>Minha disponibilidade</h2>
      <button class="primario" (click)="salvar()" [disabled]="!sem.selecionado()">Salvar</button>
    </div>
    @if (erro()) { <div class="alerta erro">{{ erro() }}</div> }
    @if (ok()) { <div class="alerta ok">{{ ok() }}</div> }
    <app-semestre />
    <p class="dica">Clique nos horários em que você pode dar aula no semestre <strong>{{ sem.codigo() }}</strong>. Só aparecem os horários liberados
      pelo coordenador do seu centro ({{ auth.usuario()?.centroSigla }}). Marcados: <strong>{{ selecao().size }}</strong></p>

    @if (!sem.selecionado()) {
      <div class="alerta">Ainda não há semestre aberto pelo coordenador.</div>
    } @else if (liberados().length === 0) {
      <div class="alerta">O coordenador ainda não liberou dias e horários para o seu centro neste semestre.</div>
    } @else {
      <table class="grade-horarios">
        <thead><tr><th>Horário</th>@for (d of dias; track d) { <th>{{ diaNome[d] }}</th> }</tr></thead>
        <tbody>
          @for (f of faixas(); track f.id) {
            <tr>
              <th>{{ f.descricao }}</th>
              @for (d of dias; track d) {
                @if (horario(d, f.id); as h) {
                  <td [class.marcado]="selecao().has(h.id)" (click)="alternar(h.id)">{{ selecao().has(h.id) ? '✔' : '' }}</td>
                } @else {
                  <td class="bloqueado" title="Não liberado pelo coordenador">—</td>
                }
              }
            </tr>
          }
        </tbody>
      </table>
    }
  `,
})
export class MinhaDisponibilidadePage {
  private api = inject(ApiService);
  auth = inject(AuthService);
  sem = inject(SemestreService);
  dias = DIAS;
  diaNome = DIA_NOME;
  faixas = signal<Faixa[]>([]);
  liberados = signal<Horario[]>([]);
  selecao = signal<Set<number>>(new Set());
  erro = signal('');
  ok = signal('');

  constructor() {
    this.sem.carregar().catch((e) => this.erro.set(mensagemErro(e)));
    effect(() => { this.sem.selecionado(); untracked(() => this.carregar()); });
  }

  async carregar() {
    this.erro.set(''); this.ok.set('');
    const semestreId = this.sem.selecionado();
    this.liberados.set([]);
    this.selecao.set(new Set());
    if (!semestreId) return;
    try {
      const centroId = this.auth.usuario()?.centroId;
      const [faixas, liberados, meus] = await Promise.all([
        this.api.get<Faixa[]>('/horarios/faixas'),
        this.api.get<Horario[]>('/horarios', { centroId, semestreId, somenteAtivos: true }),
        this.api.get<Horario[]>('/meu/disponibilidade', { semestreId }),
      ]);
      this.faixas.set(faixas);
      this.liberados.set(liberados);
      this.selecao.set(new Set(meus.filter((h) => h.status === 'ATIVO').map((h) => h.id)));
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  horario(d: DiaSemana, faixaId: number) { return this.liberados().find((h) => h.dia === d && h.faixaId === faixaId); }

  alternar(id: number) {
    const s = new Set(this.selecao());
    if (s.has(id)) s.delete(id); else s.add(id);
    this.selecao.set(s);
  }

  async salvar() {
    this.erro.set(''); this.ok.set('');
    try {
      await this.api.put('/meu/disponibilidade', { semestreId: this.sem.selecionado(), horarioIds: [...this.selecao()] });
      this.ok.set(`Disponibilidade do semestre ${this.sem.codigo()} salva.`);
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }
}
