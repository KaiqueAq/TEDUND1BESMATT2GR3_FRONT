import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, mensagemErro } from '../core/api.service';
import { Centro, Docente, Historico, PERFIL_NOME, Perfil } from '../core/models';

interface DocenteForm {
  id: number | null; matricula: string; nomeCompleto: string; email: string; telefone: string;
  centroId: number | null; perfis: Perfil[]; senhaInicial: string;
}

@Component({
  selector: 'app-docentes',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="cabecalho">
      <h2>Professores</h2>
      <button class="primario" (click)="novo()">+ Novo professor</button>
    </div>
    @if (erro()) { <div class="alerta erro">{{ erro() }}</div> }
    @if (ok()) { <div class="alerta ok">{{ ok() }}</div> }

    @if (form(); as f) {
      <form class="painel" (ngSubmit)="salvar(f)">
        <h3>{{ f.id ? 'Editar professor' : 'Novo professor' }}</h3>
        <div class="grade2">
          <label>Matrícula * <small>(também é o login)</small>
            <input name="mat" [(ngModel)]="f.matricula" required [readonly]="!!f.id" /></label>
          <label>Nome completo *<input name="nome" [(ngModel)]="f.nomeCompleto" required /></label>
          <label>E-mail<input name="email" type="email" [(ngModel)]="f.email" /></label>
          <label>Telefone<input name="tel" [(ngModel)]="f.telefone" /></label>
          <label>Centro acadêmico * <small>(vinculado a um único centro)</small>
            <select name="centro" [(ngModel)]="f.centroId" required>
              <option [ngValue]="null" disabled>Selecione</option>
              @for (c of centros(); track c.id) { <option [ngValue]="c.id">{{ c.sigla }} ({{ c.iesSigla }})</option> }
            </select>
          </label>
          <label>{{ f.id ? 'Nova senha (deixe vazio para manter)' : 'Senha inicial (vazio = matrícula)' }}
            <input name="senha" type="password" [(ngModel)]="f.senhaInicial" autocomplete="new-password" /></label>
        </div>
        <div class="checks">Perfis de acesso * (pode acumular):
          @for (p of perfisDisponiveis; track p) {
            <label class="check"><input type="checkbox" [checked]="f.perfis.includes(p)" (change)="marcarPerfil(f, p)" /> {{ nomePerfil[p] }}</label>
          }
        </div>
        <div class="acoes">
          <button type="button" class="secundario" (click)="form.set(null)">Cancelar</button>
          <button type="submit" class="primario">Salvar</button>
        </div>
      </form>
    }

    @if (inativando(); as d) {
      <div class="painel destaque">
        <h3>Inativar {{ d.nomeCompleto }}</h3>
        <label>Justificativa * <small>(afastamento, desligamento, suspensão contratual etc.)</small>
          <textarea [(ngModel)]="justificativa" rows="3"></textarea></label>
        <div class="acoes">
          <button class="secundario" (click)="inativando.set(null)">Cancelar</button>
          <button class="perigo" (click)="confirmarInativacao(d)">Inativar</button>
        </div>
      </div>
    }

    @if (historico(); as h) {
      <div class="painel">
        <h3>Histórico de {{ h.docente.nomeCompleto }}</h3>
        <table>
          <thead><tr><th>Data</th><th>Ação</th><th>Justificativa</th><th>Responsável</th></tr></thead>
          <tbody>
            @for (x of h.itens; track $index) {
              <tr><td>{{ x.dataHora | date: 'dd/MM/yyyy HH:mm' }}</td><td>{{ x.acao }}</td><td>{{ x.justificativa }}</td><td>{{ x.responsavel }}</td></tr>
            }
          </tbody>
        </table>
        <div class="acoes"><button class="secundario" (click)="historico.set(null)">Fechar</button></div>
      </div>
    }

    <table>
      <thead><tr><th>Matrícula</th><th>Nome</th><th>Centro</th><th>Contato</th><th>Perfis</th><th>Cadastro</th><th>Status</th><th></th></tr></thead>
      <tbody>
        @for (d of lista(); track d.id) {
          <tr [class.inativo]="d.status === 'INATIVO'">
            <td>{{ d.matricula }}</td><td><strong>{{ d.nomeCompleto }}</strong></td><td>{{ d.centroSigla }}</td>
            <td>{{ d.email }}<br />{{ d.telefone }}</td>
            <td>{{ perfisTexto(d) }}</td>
            <td>{{ d.dataCadastro | date: 'dd/MM/yyyy' }}</td>
            <td><span class="status" [class.off]="d.status === 'INATIVO'">{{ d.status }}</span></td>
            <td class="botoes">
              <button class="link" (click)="editar(d)">Editar</button>
              @if (d.status === 'ATIVO') {
                <button class="link perigo" (click)="inativando.set(d); justificativa = ''">Inativar</button>
              }
              <button class="link" (click)="verHistorico(d)">Histórico</button>
            </td>
          </tr>
        } @empty { <tr><td colspan="8" class="vazio">Nenhum professor cadastrado.</td></tr> }
      </tbody>
    </table>
  `,
})
export class DocentesPage {
  private api = inject(ApiService);
  perfisDisponiveis: Perfil[] = ['USUARIO', 'COLABORADOR', 'ADMINISTRADOR'];
  nomePerfil = PERFIL_NOME;
  lista = signal<Docente[]>([]);
  centros = signal<Centro[]>([]);
  form = signal<DocenteForm | null>(null);
  inativando = signal<Docente | null>(null);
  historico = signal<{ docente: Docente; itens: Historico[] } | null>(null);
  justificativa = '';
  erro = signal('');
  ok = signal('');

  constructor() {
    this.api.get<Centro[]>('/centros').then((r) => this.centros.set(r)).catch((e) => this.erro.set(mensagemErro(e)));
    this.carregar();
  }

  async carregar() {
    try { this.lista.set(await this.api.get<Docente[]>('/docentes')); }
    catch (e) { this.erro.set(mensagemErro(e)); }
  }

  perfisTexto(d: Docente) { return d.perfis.map((p) => PERFIL_NOME[p]).join(', '); }

  novo() {
    this.form.set({ id: null, matricula: '', nomeCompleto: '', email: '', telefone: '', centroId: null, perfis: ['USUARIO'], senhaInicial: '' });
  }

  editar(d: Docente) { this.form.set({ ...d, perfis: [...d.perfis], senhaInicial: '' }); }

  marcarPerfil(f: DocenteForm, p: Perfil) {
    const i = f.perfis.indexOf(p);
    if (i >= 0) f.perfis.splice(i, 1); else f.perfis.push(p);
  }

  async salvar(f: DocenteForm) {
    this.limpar();
    try {
      const body = { ...f, email: f.email || null };
      if (f.id) await this.api.put(`/docentes/${f.id}`, body); else await this.api.post('/docentes', body);
      this.ok.set(f.id ? 'Professor atualizado.' : `Professor cadastrado. Login: ${f.matricula}`);
      this.form.set(null);
      await this.carregar();
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  async confirmarInativacao(d: Docente) {
    this.limpar();
    if (!this.justificativa.trim()) { this.erro.set('A justificativa é obrigatória para inativar o professor.'); return; }
    try {
      await this.api.post(`/docentes/${d.id}/inativar`, { justificativa: this.justificativa });
      this.ok.set(`${d.nomeCompleto} inativado(a). A justificativa foi registrada no histórico.`);
      this.inativando.set(null);
      await this.carregar();
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }

  async verHistorico(d: Docente) {
    try { this.historico.set({ docente: d, itens: await this.api.get<Historico[]>(`/docentes/${d.id}/historico`) }); }
    catch (e) { this.erro.set(mensagemErro(e)); }
  }

  private limpar() { this.erro.set(''); this.ok.set(''); }
}
