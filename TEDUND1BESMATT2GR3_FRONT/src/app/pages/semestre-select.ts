import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro } from '../core/api.service';
import { SemestreService } from '../core/semestre.service';

/** Seletor de semestre usado nas telas. Com [podeCriar]=true mostra o botao para cadastrar um novo semestre. */
@Component({
  selector: 'app-semestre',
  imports: [FormsModule],
  template: `
    <div class="semestre">
      <label>Semestre
        <select [ngModel]="sem.selecionado()" (ngModelChange)="sem.selecionar($event)">
          @if (sem.lista().length === 0) { <option [ngValue]="null">Nenhum semestre cadastrado</option> }
          @for (s of sem.lista(); track s.id) {
            <option [ngValue]="s.id">{{ s.codigo }}</option>
          }
        </select>
      </label>
      @if (podeCriar()) {
        @if (criando()) {
          <input [(ngModel)]="codigo" placeholder="ex.: 2027.1" maxlength="6" (keyup.enter)="criar()" />
          <button class="primario" (click)="criar()">Criar</button>
          <button class="link" (click)="criando.set(false)">cancelar</button>
        } @else {
          <button class="secundario" (click)="criando.set(true)">+ Novo semestre</button>
        }
      }
      @if (erro()) { <span class="erro-inline">{{ erro() }}</span> }
    </div>
  `,
})
export class SemestreSelect {
  sem = inject(SemestreService);
  podeCriar = input(false);
  criando = signal(false);
  erro = signal('');
  codigo = '';

  async criar() {
    this.erro.set('');
    try {
      await this.sem.criar(this.codigo.trim());
      this.codigo = '';
      this.criando.set(false);
    } catch (e) { this.erro.set(mensagemErro(e)); }
  }
}
