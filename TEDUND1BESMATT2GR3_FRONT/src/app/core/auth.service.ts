import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './config';
import { Perfil, UsuarioLogado } from './models';

const CHAVE_TOKEN = 'sdd_token';
const CHAVE_USUARIO = 'sdd_usuario';

/**
 * Login com Spring Security (HTTP Basic): a tela manda login/senha para /api/auth/me.
 * Se o back responder 200, guardamos as credenciais (codificadas) so nesta aba do navegador.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private token = signal<string | null>(sessionStorage.getItem(CHAVE_TOKEN));
  readonly usuario = signal<UsuarioLogado | null>(JSON.parse(sessionStorage.getItem(CHAVE_USUARIO) ?? 'null'));
  readonly logado = computed(() => !!this.usuario());

  get authorization(): string | null {
    const t = this.token();
    return t ? 'Basic ' + t : null;
  }

  async entrar(login: string, senha: string): Promise<void> {
    const token = btoa(unescape(encodeURIComponent(login + ':' + senha)));
    const headers = new HttpHeaders({ Authorization: 'Basic ' + token });
    const usuario = await firstValueFrom(this.http.get<UsuarioLogado>(`${API_URL}/auth/me`, { headers }));
    sessionStorage.setItem(CHAVE_TOKEN, token);
    sessionStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
    this.token.set(token);
    this.usuario.set(usuario);
  }

  sair(): void {
    sessionStorage.removeItem(CHAVE_TOKEN);
    sessionStorage.removeItem(CHAVE_USUARIO);
    this.token.set(null);
    this.usuario.set(null);
    this.router.navigate(['/login']);
  }

  /** Primeira tela depois do login, conforme o perfil. */
  rotaInicial(): string {
    if (this.tem('ADMINISTRADOR')) return '/ies';
    if (this.tem('COLABORADOR')) return '/horarios';
    return '/minha-disponibilidade';
  }

  tem(...perfis: Perfil[]): boolean {
    const u = this.usuario();
    return !!u && perfis.some((p) => u.perfis.includes(p));
  }
}
