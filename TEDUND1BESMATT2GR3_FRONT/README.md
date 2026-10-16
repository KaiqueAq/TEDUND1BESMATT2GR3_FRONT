# Sistema de Controle de Disponibilidade Docente — FRONT-END (Angular)

Tela do sistema. Conversa só com o back-end em `http://localhost:8080/api` (`src/app/core/config.ts`).

## Como rodar

```bash
npm install
npm start          # http://localhost:4200
```

O back-end precisa estar rodando. A tela tem que ficar em `http://localhost:4200`, porque o back só aceita chamadas desse endereço.

Primeiro acesso: **admin / admin123**. Professores cadastrados entram com login = matrícula e senha = matrícula (ou a senha inicial informada).

## Estrutura

```
src/app/
  core/    login, envio do login em cada chamada, bloqueio de rotas por perfil, chamadas à API, semestre, modelos
  pages/   uma tela por funcionalidade
    login, layout (menu por perfil)
    ies, centros, cursos, docentes, auditoria        -> Administrador
    horarios, disciplinas, mapa                       -> Colaborador
    minha-disponibilidade, meus-interesses            -> Usuário
    relatorios                                        -> cada perfil vê os seus
```
