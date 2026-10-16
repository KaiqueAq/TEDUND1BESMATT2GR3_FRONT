import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, mensagemErro } from '../core/api.service';
import { Centro, Curso, Turno } from '../core/models';

interface CursoForm {
  id: number | null; sigla: string; descricao: string; centroId: number | null; turnos: Turno[]; coordenador: string;
}

@Component({
  selector: 'app-cursos',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="cabecalho">
      <h2>Cursos</h2>
      <button class="primario" (click)="novo()">+ Novo curso</button>
    </div>
    @if (erro()) { <div class="alerta erro">{{ erro() }}</div> }
    @if (ok()) { <div class="alerta ok">{{ ok() }}</div> }

    @if (form(); as f) {
      <form class="painel" (ngSubmit)="salvar(f)">
        <h3>{{ f.id ? 'Editar curso' : 'Novo curso' }}</h3>
        <div class="grade2">
          <label>Centro acadêmico * <small>(curso pertence a um único centro)</small>
            <select name="centro" [(ngModel)]="f.centroId" required>
              <option [ngValue]="null" disabled>Selecione</option>
              @for (c of centros(); track c.id) { <option [ngValue]="c.id" [disabled]="c.status === 'INATIVO'">{{ c.sigla }} ({{ c.iesSigla }})</option> }
            </select>
          </label>
          <label>Sigla *<input name="sigla" [(ngModel)]="f.sigla" required maxlength="20" /></label>
          <label class="inteira">Descrição do curso *<input name="desc" [(ngModel)]="f.descricao" required /></label>
          <label class="inteira">Coordenador(a) do curso *<input name="coord" [(ngModel)]="f.coordenador" required /></label>
        </div>
        <div class="checks">Turnos oferecidos *:
          @for (t of turnos; track t) {
            <label class="check"><input type="checkbox" [checked]="f.turnos.includes(t)" (change)="marcarTurno(f, t)" /> {{ t }}</label>
          }
        </div>
        <div class="acoes">
          <button type="button" class="secundario" (click)="form.set(null)">Cancelar</button>
          <button type="submit" class="primario">Salvar</button>
        </div>
      </form>
    }

    <table>
      <thead><tr><th>Sigla</th><th>Curso</th><th>Centro</th><th>Turnos</th><th>Coordenador(a)</th><th>Cadastro</th><th>Status</th><th></th></tr></thead>
      <tbody>
        @for (c of lista(); track c.id) {
          <tr [class.inativo]="c.status === 'INATIVO'">
            <td><strong>{{ c.sigla }}</strong></td><td>{{ c.descricao }}</td><td>{{ c.centroSigla }}</td>
            <td>{{ c.turnos.join(', ') }}</td><td>{{ c.coordenador }}</td>
            <td>{{ c.dataCadastro | date: 'dd/MM/yyyy' }}</td>
            <td><span class="status" [class.off]="c.status === 'INATIVO'">{{ c.status }}</span></td>
            <td class="botoes">
              <button class="link" (click)="editar(c)">Editar</button>
              @if (c.status === 'ATIVO') { <button class="link" (click)="inativar(c)">Inativar</button> }
              <button class="link perigo" (click)="excluir(c)">Excluir</button>
            </td>
          </tr>
        } @empty { <tr><td colspan="8" class="vazio">Nenhum curso cadastrado.</td></tr> }
      </tbody>
    </table>
  `,
})
export class CursosPage {
  private api = inject(ApiService);
  turnos: Turno[] = ['MATUTINO', 'VESPERTINO', 'NOTURNO'];
  lista = signal<Curso[]>([]);
  centros = signal<Centro[]>([]);
  form = signal<CursoForm | null>(null);
  erro = signal('');
  ok = signal('');

  constructor() {
    this.api.get<Centro[]>('/centros').then((r) => this.centros.set(r)).catch((e) => this.erro.set(mensagemErro(e)));
    this.carregar();
  }

  async carregar() {
    try { this.lista.set(await this.api.get<Curso[]>('/cursos')); }
    catch (e) { this.erro.set(mensagemErro(e)); }
  }

  novo() {
    this.form.set({ id: null, sigla: '', descricao: '', centroId: null, turnos: [], coordenador: '' });
  }

  editar(c: Curso) { this.form.set({ ...c, turnos: [...c.turnos] }); }

  marcarTurno(f: CursoForm, t: Turno) {
    const i = f.turnos.indexOf(t);
    if (i >= 0) f.turnos.splice(i, 1); else f.turnos.push(t);
  }

  async salvar(f: CursoForm) {
    this.limpar();
    try {
      if (f.id) await this.api.put(`/cursos/${f.id}`, f); else await this.api.post('/cursos', f);
      this.ok.set('Curso salvo com sucesso.');
      this.form.set(null);
      await this.carregar();
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  async inativar(c: Curso) {
    this.limpar();
    try {
      await this.api.patch(`/cursos/${c.id}/inativar`);
      await this.carregar();
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  async excluir(c: Curso) {
    this.limpar();
    if (!confirm(`Excluir o curso ${c.sigla}?`)) return;
    try {
      await this.api.delete(`/cursos/${c.id}`);
      this.ok.set('Curso excluído.');
      await this.carregar();
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  private limpar() { this.erro.set(''); this.ok.set(''); }
}
