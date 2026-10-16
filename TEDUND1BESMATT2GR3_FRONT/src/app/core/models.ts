export type Status = 'ATIVO' | 'INATIVO';
export type Perfil = 'ADMINISTRADOR' | 'COLABORADOR' | 'USUARIO';
export type DiaSemana = 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB';
export type Turno = 'MATUTINO' | 'VESPERTINO' | 'NOTURNO';

export const DIAS: DiaSemana[] = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
export const DIA_NOME: Record<DiaSemana, string> = {
  SEG: 'Segunda', TER: 'Terça', QUA: 'Quarta', QUI: 'Quinta', SEX: 'Sexta', SAB: 'Sábado',
};
export const PERFIL_NOME: Record<Perfil, string> = {
  ADMINISTRADOR: 'Administrador', COLABORADOR: 'Colaborador (Coordenador)', USUARIO: 'Usuário (Professor)',
};

export interface UsuarioLogado {
  login: string; nome: string; perfis: Perfil[];
  docenteId: number | null; centroId: number | null; centroSigla: string | null;
}
export interface ProReitoria { nome: string; nomeado: string; }
export interface Ies {
  id: number; sigla: string; nome: string; emailCentral: string; telefoneCentral: string;
  reitor: string; proReitorias: ProReitoria[]; dataCadastro: string; status: Status;
}
export interface Centro {
  id: number; sigla: string; nome: string; emailCentral: string; telefoneCentral: string;
  coordenador: string; iesId: number; iesSigla: string; dataCadastro: string; status: Status;
}
export interface Curso {
  id: number; sigla: string; descricao: string; centroId: number; centroSigla: string;
  turnos: Turno[]; coordenador: string; dataCadastro: string; status: Status;
}
export interface Docente {
  id: number; matricula: string; nomeCompleto: string; email: string; telefone: string;
  centroId: number; centroSigla: string; login: string; perfis: Perfil[]; dataCadastro: string; status: Status;
}
export interface Historico { dataHora: string; acao: string; justificativa: string | null; responsavel: string; }
export interface Semestre { id: number; codigo: string; dataCadastro: string; }
export interface Faixa { id: number; inicio: string; fim: string; ordem: number; descricao: string; }
export interface Horario {
  id: number; centroId: number; semestreId: number; semestre: string; dia: DiaSemana; faixaId: number; faixa: string;
  ordem: number; status: Status;
}
export interface Disciplina {
  id: number; sigla: string; descricao: string; cursoId: number; cursoSigla: string; centroId: number;
  cargaHoraria: number; dataCadastro: string; status: Status;
}
export interface Interesse { disciplinaId: number; sigla: string; descricao: string; cursoSigla: string; prioridade: number; }
export interface MapaItem {
  id: number; semestre: string; docenteId: number; docenteNome: string; disciplinaId: number; disciplina: string;
  horarioId: number; dia: DiaSemana; faixa: string; ordem: number; status: Status;
}
export interface Log {
  id: number; dataHora: string; usuario: string; acao: string; entidade: string; entidadeId: number | null; detalhe: string;
}
export interface Emissao { emitidoPor: string; login: string; emitidoEm: string; }
export interface Relatorio<T> { titulo: string; emissao: Emissao; dados: T; }
export interface DocenteDisponibilidade { docente: Docente; horarios: Horario[]; interesses: Interesse[]; }
