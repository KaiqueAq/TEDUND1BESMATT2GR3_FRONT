import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, mensagemErro } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Curso, Disciplina } from '../core/models';

interface DisciplinaForm { id: number | null; sigla: string; descricao: string; cursoId: number | null; cargaHoraria: number | null; }

@Component({
  selector: 'app-disciplinas',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="cabecalho">
      <h2>Disciplinas</h2>
      <button class="primario" (click)="novo()">+ Nova disciplina</button>
    </div>
    @if (erro()) { <div class="alerta erro">{{ erro() }}</div> }
    @if (ok()) { <div class="alerta ok">{{ ok() }}</div> }

    @if (form(); as f) {
      <form class="painel" (ngSubmit)="salvar(f)">
        <h3>{{ f.id ? 'Editar disciplina' : 'Nova disciplina' }}</h3>
        <div class="grade2">
          <label>Curso * <small>(disciplina pertence a um único curso)</small>
            <select name="curso" [(ngModel)]="f.cursoId" required>
              <option [ngValue]="null" disabled>Selecione</option>
              @for (c of cursos(); track c.id) { <option [ngValue]="c.id" [disabled]="c.status === 'INATIVO'">{{ c.sigla }} - {{ c.descricao }}</option> }
            </select>
          </label>
          <label>Sigla *<input name="sigla" [(ngModel)]="f.sigla" required maxlength="20" /></label>
          <label>Descrição da disciplina *<input name="desc" [(ngModel)]="f.descricao" required /></label>
          <label>Carga horária (h) *<input name="ch" type="number" min="1" [(ngModel)]="f.cargaHoraria" required /></label>
        </div>
        <div class="acoes">
          <button type="button" class="secundario" (click)="form.set(null)">Cancelar</button>
          <button type="submit" class="primario">Salvar</button>
        </div>
      </form>
    }

    <table>
      <thead><tr><th>Sigla</th><th>Disciplina</th><th>Curso</th><th>CH</th><th>Cadastro</th><th>Status</th><th></th></tr></thead>
      <tbody>
        @for (d of lista(); track d.id) {
          <tr [class.inativo]="d.status === 'INATIVO'">
            <td><strong>{{ d.sigla }}</strong></td><td>{{ d.descricao }}</td><td>{{ d.cursoSigla }}</td><td>{{ d.cargaHoraria }}h</td>
            <td>{{ d.dataCadastro | date: 'dd/MM/yyyy' }}</td>
            <td><span class="status" [class.off]="d.status === 'INATIVO'">{{ d.status }}</span></td>
            <td class="botoes">
              <button class="link" (click)="editar(d)">Editar</button>
              @if (d.status === 'ATIVO') { <button class="link" (click)="inativar(d)">Inativar</button> }
              <button class="link perigo" (click)="excluir(d)">Excluir</button>
            </td>
          </tr>
        } @empty { <tr><td colspan="7" class="vazio">Nenhuma disciplina cadastrada.</td></tr> }
      </tbody>
    </table>
    <p class="dica">Disciplinas inativas deixam de aparecer para os professores escolherem.</p>
  `,
})
export class DisciplinasPage {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  lista = signal<Disciplina[]>([]);
  cursos = signal<Curso[]>([]);
  form = signal<DisciplinaForm | null>(null);
  erro = signal('');
  ok = signal('');
  /** Coordenador trabalha com os cursos do seu centro; administrador ve todos. */
  private centroId = this.auth.tem('ADMINISTRADOR') ? null : this.auth.usuario()?.centroId ?? null;

  constructor() {
    this.api.get<Curso[]>('/cursos', { centroId: this.centroId }).then((r) => this.cursos.set(r))
      .catch((e) => this.erro.set(mensagemErro(e)));
    this.carregar();
  }

  async carregar() {
    try {
      this.lista.set(await this.api.get<Disciplina[]>('/disciplinas', { centroId: this.centroId }));
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  novo() { this.form.set({ id: null, sigla: '', descricao: '', cursoId: null, cargaHoraria: null }); }

  editar(d: Disciplina) { this.form.set({ ...d }); }

  async salvar(f: DisciplinaForm) {
    this.limpar();
    try {
      if (f.id) await this.api.put(`/disciplinas/${f.id}`, f); else await this.api.post('/disciplinas', f);
      this.ok.set('Disciplina salva com sucesso.');
      this.form.set(null);
      await this.carregar();
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  async inativar(d: Disciplina) {
    this.limpar();
    try {
      await this.api.patch(`/disciplinas/${d.id}/inativar`);
      await this.carregar();
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  async excluir(d: Disciplina) {
    this.limpar();
    if (!confirm(`Excluir a disciplina ${d.sigla}?`)) return;
    try {
      await this.api.delete(`/disciplinas/${d.id}`);
      this.ok.set('Disciplina excluída.');
      await this.carregar();
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  private limpar() { this.erro.set(''); this.ok.set(''); }
}
