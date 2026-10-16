import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, mensagemErro } from '../core/api.service';
import { Centro, Ies } from '../core/models';

interface CentroForm {
  id: number | null; sigla: string; nome: string; emailCentral: string; telefoneCentral: string;
  coordenador: string; iesId: number | null;
}

@Component({
  selector: 'app-centros',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="cabecalho">
      <h2>Centros Acadêmicos</h2>
      <button class="primario" (click)="novo()">+ Novo centro</button>
    </div>
    @if (erro()) { <div class="alerta erro">{{ erro() }}</div> }
    @if (ok()) { <div class="alerta ok">{{ ok() }}</div> }

    @if (form(); as f) {
      <form class="painel" (ngSubmit)="salvar(f)">
        <h3>{{ f.id ? 'Editar centro' : 'Novo centro' }}</h3>
        <div class="grade2">
          <label>IES * <small>(todo centro pertence a uma única IES)</small>
            <select name="ies" [(ngModel)]="f.iesId" required>
              <option [ngValue]="null" disabled>Selecione</option>
              @for (i of ies(); track i.id) { <option [ngValue]="i.id" [disabled]="i.status === 'INATIVO'">{{ i.sigla }} - {{ i.nome }}</option> }
            </select>
          </label>
          <label>Sigla *<input name="sigla" [(ngModel)]="f.sigla" required maxlength="20" /></label>
          <label class="inteira">Nome *<input name="nome" [(ngModel)]="f.nome" required /></label>
          <label>E-mail central<input name="email" type="email" [(ngModel)]="f.emailCentral" /></label>
          <label>Telefone central<input name="tel" [(ngModel)]="f.telefoneCentral" /></label>
          <label class="inteira">Coordenador(a) * <small>(só 1 coordenador por centro)</small>
            <input name="coord" [(ngModel)]="f.coordenador" required /></label>
        </div>
        <div class="acoes">
          <button type="button" class="secundario" (click)="form.set(null)">Cancelar</button>
          <button type="submit" class="primario">Salvar</button>
        </div>
      </form>
    }

    <table>
      <thead><tr><th>Sigla</th><th>Nome</th><th>IES</th><th>Coordenador(a)</th><th>Contato</th><th>Cadastro</th><th>Status</th><th></th></tr></thead>
      <tbody>
        @for (c of lista(); track c.id) {
          <tr [class.inativo]="c.status === 'INATIVO'">
            <td><strong>{{ c.sigla }}</strong></td><td>{{ c.nome }}</td><td>{{ c.iesSigla }}</td><td>{{ c.coordenador }}</td>
            <td>{{ c.emailCentral }}<br />{{ c.telefoneCentral }}</td>
            <td>{{ c.dataCadastro | date: 'dd/MM/yyyy' }}</td>
            <td><span class="status" [class.off]="c.status === 'INATIVO'">{{ c.status }}</span></td>
            <td class="botoes">
              <button class="link" (click)="editar(c)">Editar</button>
              @if (c.status === 'ATIVO') { <button class="link" (click)="inativar(c)">Inativar</button> }
              <button class="link perigo" (click)="excluir(c)">Excluir</button>
            </td>
          </tr>
        } @empty { <tr><td colspan="8" class="vazio">Nenhum centro cadastrado.</td></tr> }
      </tbody>
    </table>
  `,
})
export class CentrosPage {
  private api = inject(ApiService);
  lista = signal<Centro[]>([]);
  ies = signal<Ies[]>([]);
  form = signal<CentroForm | null>(null);
  erro = signal('');
  ok = signal('');

  constructor() {
    this.api.get<Ies[]>('/ies').then((r) => this.ies.set(r)).catch((e) => this.erro.set(mensagemErro(e)));
    this.carregar();
  }

  async carregar() {
    try { this.lista.set(await this.api.get<Centro[]>('/centros')); }
    catch (e) { this.erro.set(mensagemErro(e)); }
  }

  novo() {
    this.form.set({ id: null, sigla: '', nome: '', emailCentral: '', telefoneCentral: '', coordenador: '', iesId: null });
  }

  editar(c: Centro) { this.form.set({ ...c }); }

  async salvar(f: CentroForm) {
    this.limpar();
    try {
      const body = { ...f, emailCentral: f.emailCentral || null };
      if (f.id) await this.api.put(`/centros/${f.id}`, body); else await this.api.post('/centros', body);
      this.ok.set('Centro salvo com sucesso.');
      this.form.set(null);
      await this.carregar();
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  async inativar(c: Centro) {
    this.limpar();
    try {
      await this.api.patch(`/centros/${c.id}/inativar`);
      await this.carregar();
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  async excluir(c: Centro) {
    this.limpar();
    if (!confirm(`Excluir o centro ${c.sigla}?`)) return;
    try {
      await this.api.delete(`/centros/${c.id}`);
      this.ok.set('Centro excluído.');
      await this.carregar();
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  private limpar() { this.erro.set(''); this.ok.set(''); }
}
