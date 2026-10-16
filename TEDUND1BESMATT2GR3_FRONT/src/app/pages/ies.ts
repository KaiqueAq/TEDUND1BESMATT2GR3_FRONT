import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, mensagemErro } from '../core/api.service';
import { Ies, ProReitoria } from '../core/models';

interface IesForm {
  id: number | null; sigla: string; nome: string; emailCentral: string; telefoneCentral: string;
  reitor: string; proReitorias: ProReitoria[];
}

@Component({
  selector: 'app-ies',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="cabecalho">
      <h2>Faculdades (IES)</h2>
      <button class="primario" (click)="novo()">+ Nova IES</button>
    </div>
    @if (erro()) { <div class="alerta erro">{{ erro() }}</div> }
    @if (ok()) { <div class="alerta ok">{{ ok() }}</div> }

    @if (form(); as f) {
      <form class="painel" (ngSubmit)="salvar(f)">
        <h3>{{ f.id ? 'Editar IES' : 'Nova IES' }}</h3>
        <div class="grade2">
          <label>Sigla *<input name="sigla" [(ngModel)]="f.sigla" required maxlength="20" /></label>
          <label>Nome *<input name="nome" [(ngModel)]="f.nome" required /></label>
          <label>E-mail central<input name="email" type="email" [(ngModel)]="f.emailCentral" /></label>
          <label>Telefone central<input name="tel" [(ngModel)]="f.telefoneCentral" /></label>
          <label class="inteira">Reitor(a) * <small>(só pode existir 1 reitor por IES)</small>
            <input name="reitor" [(ngModel)]="f.reitor" required /></label>
        </div>
        <h4>Pró-reitorias</h4>
        @for (p of f.proReitorias; track $index) {
          <div class="linha">
            <input [name]="'prn' + $index" [(ngModel)]="p.nome" placeholder="Pró-reitoria (ex.: Graduação)" />
            <input [name]="'pro' + $index" [(ngModel)]="p.nomeado" placeholder="Nome do(a) nomeado(a)" />
            <button type="button" class="link perigo" (click)="f.proReitorias.splice($index, 1)">remover</button>
          </div>
        }
        <button type="button" class="secundario" (click)="f.proReitorias.push({ nome: '', nomeado: '' })">+ Pró-reitoria</button>
        <div class="acoes">
          <button type="button" class="secundario" (click)="form.set(null)">Cancelar</button>
          <button type="submit" class="primario">Salvar</button>
        </div>
      </form>
    }

    <table>
      <thead><tr><th>Sigla</th><th>Nome</th><th>Reitor(a)</th><th>Pró-reitorias</th><th>Cadastro</th><th>Status</th><th></th></tr></thead>
      <tbody>
        @for (i of lista(); track i.id) {
          <tr [class.inativo]="i.status === 'INATIVO'">
            <td><strong>{{ i.sigla }}</strong></td><td>{{ i.nome }}</td><td>{{ i.reitor }}</td>
            <td>@for (p of i.proReitorias; track $index) { <div>{{ p.nome }}: {{ p.nomeado }}</div> }</td>
            <td>{{ i.dataCadastro | date: 'dd/MM/yyyy' }}</td>
            <td><span class="status" [class.off]="i.status === 'INATIVO'">{{ i.status }}</span></td>
            <td class="botoes">
              <button class="link" (click)="editar(i)">Editar</button>
              @if (i.status === 'ATIVO') { <button class="link" (click)="inativar(i)">Inativar</button> }
              <button class="link perigo" (click)="excluir(i)">Excluir</button>
            </td>
          </tr>
        } @empty { <tr><td colspan="7" class="vazio">Nenhuma IES cadastrada.</td></tr> }
      </tbody>
    </table>
  `,
})
export class IesPage {
  private api = inject(ApiService);
  lista = signal<Ies[]>([]);
  form = signal<IesForm | null>(null);
  erro = signal('');
  ok = signal('');

  constructor() { this.carregar(); }

  async carregar() {
    try { this.lista.set(await this.api.get<Ies[]>('/ies')); } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  novo() {
    this.form.set({ id: null, sigla: '', nome: '', emailCentral: '', telefoneCentral: '', reitor: '', proReitorias: [] });
  }

  editar(i: Ies) {
    this.form.set({ ...i, proReitorias: i.proReitorias.map((p) => ({ ...p })) });
  }

  async salvar(f: IesForm) {
    this.limpar();
    const body = { ...f, emailCentral: f.emailCentral || null, proReitorias: f.proReitorias.filter((p) => p.nome?.trim()) };
    try {
      if (f.id) await this.api.put(`/ies/${f.id}`, body); else await this.api.post('/ies', body);
      this.ok.set('IES salva com sucesso.');
      this.form.set(null);
      await this.carregar();
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  async inativar(i: Ies) {
    this.limpar();
    try {
      await this.api.patch(`/ies/${i.id}/inativar`);
      await this.carregar();
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  async excluir(i: Ies) {
    this.limpar();
    if (!confirm(`Excluir a IES ${i.sigla}?`)) return;
    try {
      await this.api.delete(`/ies/${i.id}`);
      this.ok.set('IES excluída.');
      await this.carregar();
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  private limpar() { this.erro.set(''); this.ok.set(''); }
}
