import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Semestre } from './models';

const CHAVE = 'sdd_semestre';

/** Semestre escolhido nas telas (fica lembrado enquanto a aba estiver aberta). Padrao: o mais recente. */
@Injectable({ providedIn: 'root' })
export class SemestreService {
  private api = inject(ApiService);
  readonly lista = signal<Semestre[]>([]);
  readonly selecionado = signal<number | null>(Number(sessionStorage.getItem(CHAVE)) || null);

  async carregar(): Promise<void> {
    const lista = await this.api.get<Semestre[]>('/semestres');
    this.lista.set(lista);
    const atual = this.selecionado();
    if (!lista.some((s) => s.id === atual)) this.selecionar(lista[0]?.id ?? null);
  }

  selecionar(id: number | null): void {
    this.selecionado.set(id);
    if (id) sessionStorage.setItem(CHAVE, String(id)); else sessionStorage.removeItem(CHAVE);
  }

  async criar(codigo: string): Promise<Semestre> {
    const s = await this.api.post<Semestre>('/semestres', { codigo });
    await this.carregar();
    this.selecionar(s.id);
    return s;
  }

  codigo(): string {
    return this.lista().find((s) => s.id === this.selecionado())?.codigo ?? '';
  }
}
