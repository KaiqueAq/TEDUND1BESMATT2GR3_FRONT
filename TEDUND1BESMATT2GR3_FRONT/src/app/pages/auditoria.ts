import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService, mensagemErro } from '../core/api.service';
import { Log } from '../core/models';

/** Administrador consulta o historico de acoes (logs de auditoria). */
@Component({
  selector: 'app-auditoria',
  imports: [DatePipe],
  template: `
    <div class="cabecalho"><h2>Histórico de ações</h2></div>
    @if (erro()) { <div class="alerta erro">{{ erro() }}</div> }
    <table>
      <thead><tr><th>Data/hora</th><th>Usuário</th><th>Ação</th><th>Registro</th><th>Detalhe</th></tr></thead>
      <tbody>
        @for (l of logs(); track l.id) {
          <tr>
            <td>{{ l.dataHora | date: 'dd/MM/yyyy HH:mm:ss' }}</td><td>{{ l.usuario }}</td>
            <td><span class="tag">{{ l.acao }}</span></td><td>{{ l.entidade }}{{ l.entidadeId ? ' #' + l.entidadeId : '' }}</td>
            <td>{{ l.detalhe }}</td>
          </tr>
        } @empty { <tr><td colspan="5" class="vazio">Nenhum registro.</td></tr> }
      </tbody>
    </table>
  `,
})
export class AuditoriaPage {
  private api = inject(ApiService);
  logs = signal<Log[]>([]);
  erro = signal('');

  constructor() { this.carregar(); }

  async carregar() {
    this.erro.set('');
    try { this.logs.set(await this.api.get<Log[]>('/auditoria')); }
    catch (e) { this.erro.set(mensagemErro(e)); }
  }
}
