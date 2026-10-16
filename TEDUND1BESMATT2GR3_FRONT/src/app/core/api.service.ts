import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './config';

type Params = Record<string, string | number | boolean | null | undefined>;

/** Chamadas ao back-end. Tudo passa por aqui (a tela nunca acessa o banco). */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  get<T>(path: string, params?: Params): Promise<T> {
    return firstValueFrom(this.http.get<T>(API_URL + path, { params: this.params(params) }));
  }

  post<T>(path: string, body: unknown = {}): Promise<T> {
    return firstValueFrom(this.http.post<T>(API_URL + path, body));
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.put<T>(API_URL + path, body));
  }

  patch<T>(path: string, body: unknown = {}): Promise<T> {
    return firstValueFrom(this.http.patch<T>(API_URL + path, body));
  }

  delete(path: string): Promise<unknown> {
    return firstValueFrom(this.http.delete(API_URL + path));
  }

  private params(p?: Params): HttpParams {
    let hp = new HttpParams();
    Object.entries(p ?? {}).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') hp = hp.set(k, String(v));
    });
    return hp;
  }
}

/** Extrai a mensagem de erro que o back devolve ({ mensagem: "..." }). */
export function mensagemErro(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return 'Não foi possível falar com o servidor. Verifique se o back-end está rodando.';
    const m = (e.error as { mensagem?: string } | null)?.mensagem;
    if (m) return m;
    if (e.status === 403) return 'Seu perfil não tem permissão para esta ação.';
    return `Erro ${e.status}`;
  }
  return 'Erro inesperado.';
}
