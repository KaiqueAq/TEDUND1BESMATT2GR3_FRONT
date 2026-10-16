import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { mensagemErro } from '../core/api.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="login-fundo">
      <form class="login-card" (ngSubmit)="entrar()">
        <h1>Disponibilidade Docente</h1>
        <p class="sub">Entre com seu login e senha</p>
        <label>Login (matrícula)
          <input name="login" [(ngModel)]="login" autocomplete="username" required autofocus />
        </label>
        <label>Senha
          <input name="senha" type="password" [(ngModel)]="senha" autocomplete="current-password" required />
        </label>
        @if (erro()) { <div class="alerta erro">{{ erro() }}</div> }
        <button class="primario" type="submit" [disabled]="carregando()">
          {{ carregando() ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
    </div>
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  login = '';
  senha = '';
  erro = signal('');
  carregando = signal(false);

  constructor() {
    if (this.auth.logado()) this.router.navigateByUrl(this.auth.rotaInicial());
  }

  async entrar() {
    this.erro.set('');
    this.carregando.set(true);
    try {
      await this.auth.entrar(this.login.trim(), this.senha);
      this.router.navigateByUrl(this.auth.rotaInicial());
    } catch (e) {
      this.erro.set(e instanceof HttpErrorResponse && e.status === 401 ? 'Login ou senha inválidos.' : mensagemErro(e));
    } finally {
      this.carregando.set(false);
    }
  }
}
