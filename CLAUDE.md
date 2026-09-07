# course-builder

## Visão geral

Projeto open source para geração e visualização de cursos de estudo estruturados,
sobre qualquer tema (programação, mecatrônica, idiomas, etc). Nasce como uma
evolução do estudo pessoal do Samuel e caminha para virar a base de um SaaS
(hospedagem dos cursos gerados, com opção de self-host via clone do repositório).

O projeto tem duas partes que evoluem juntas mas são desacopladas por um
contrato de storage bem definido:

1. **Skill do Claude** (`skill/`) — já implementada. Gera o curso (esqueleto +
   aulas + exercícios sob demanda) e escreve tudo em Markdown num vault local
   (Obsidian ou qualquer pasta).
2. **App de visualização** (`apps/web/` + `apps/local-server/`) — a construir.
   Renderiza o que a skill gera como uma trilha interativa (estilo
   [roadmap.sh](https://roadmap.sh/frontend)) e páginas de aula/exercício.

A regra que amarra tudo: **os arquivos Markdown no vault são a única fonte de
verdade**. A skill escreve, o app lê (e futuramente escreve também). Nenhum dos
dois lados guarda estado que não esteja no vault.

## Decisões já tomadas

### Skill (`skill/`)
- Nome: `course-builder`. Ver `skill/SKILL.md` e `skill/references/*` para o
  detalhamento completo (formato do cronograma, aulas, exercícios, adapters).
- Fluxo em 2 fases: gera um esqueleto/cronograma primeiro (módulos → tópicos →
  subtópicos, 2–3 linhas de escopo por subtópico), depois gera aulas e
  exercícios sob demanda em sessões futuras, sempre relendo o estado salvo.
- Progresso e estado ficam dentro do próprio `00-curriculum.md`, em blocos
  `topic-meta` (YAML): `status`, `perceived_difficulty`, `weak_points`,
  `last_reviewed`. Esses blocos são o contrato de dados entre skill e app.
- Loop de reforço: correção de exercícios atualiza `weak_points` no
  cronograma; a próxima aula do tópico relacionado abre com uma seção de
  revisão rápida antes de ensinar conteúdo novo.
- Já embalada como `.skill` e testável no Claude Desktop/Code.

### Arquitetura geral
- Padrão **storage adapter**: a skill e o servidor local nunca hardcodam "é
  arquivo" — sempre passam por um adapter (`local` hoje, `remote`/API do SaaS
  no futuro). Isso é o que permite trocar de local para hospedado sem reescrever
  a lógica de negócio.
- O contrato de API do adapter `remote` já está desenhado em
  `skill/references/storage-adapters.md` (`GET /courses`,
  `GET/PUT /courses/<slug>/<path>`) — o servidor local vai implementar esse
  mesmo contrato.

### Stack escolhida
- **Parser** (`packages/course-parser`): Python + Pydantic v2. Converte os
  arquivos Markdown (cronograma, aulas, exercícios) em modelos estruturados.
  É o núcleo compartilhado entre o servidor local e, futuramente, as Lambdas
  do SaaS (mesma linguagem do backend serverless já planejado).
- **Servidor local** (`apps/local-server`): Python + FastAPI, importando o
  `course-parser`. Primeiro projeto open source do Samuel em Python — usar
  ferramental moderno: `uv` (gerenciamento de pacotes/ambiente), `ruff`
  (lint + format), `pytest` (testes do parser), `watchfiles` (observar
  mudanças no vault) + SSE do FastAPI (atualização em tempo real no frontend).
- **Frontend** (`apps/web`): React + Vite + TypeScript. `@xyflow/react`
  (React Flow) para a trilha interativa com layout automático (`elkjs` ou
  `dagre`), TanStack Query para fetch/cache, `react-markdown` + Shiki para
  renderizar aulas com syntax highlighting, Tailwind + shadcn/ui para a UI.
- **Tipos entre Python e TS**: FastAPI gera OpenAPI a partir dos models
  Pydantic; `openapi-typescript` gera os tipos TS a partir desse schema —
  sem duplicar definições nos dois lados.
- Código: identificadores e comentários sempre em inglês, independente do
  idioma de conversa/documentação.

### Fora do escopo do protótipo (decisões de adiar, não de descartar)
- **Write-back pela UI**: o app só lê no MVP. Editar progresso pela UI mexe
  com edição concorrente do mesmo arquivo que o usuário edita à mão no
  Obsidian — fica para depois do resto estar estável.
- **Empacotamento desktop (Tauri)**: cogitado como alternativa/evolução ao
  servidor local + navegador, não como ponto de partida.
- **File System Access API** (`showDirectoryPicker`): modo alternativo
  "zero instalação" possível no futuro, só Chromium, não é o caminho principal.
- **Backend do SaaS** (AWS serverless): vem depois do app local provar o
  conceito; reaproveita o `course-parser` e o mesmo frontend.

## Estrutura do monorepo (alvo)

```
course-builder/
  skill/                      <- pronto
    SKILL.md
    references/
    assets/
  packages/
    course-parser/            <- Python: Markdown -> Pydantic models
  apps/
    local-server/             <- FastAPI, contrato da API sobre o vault local
    web/                      <- React + Vite + TS
  CLAUDE.md                   <- este arquivo
```

## Plano de desenvolvimento — protótipo rápido para testes

Ordem pensada para ter algo visível e testável o quanto antes, cada feature
entregando um incremento demonstrável. Escopo mínimo por feature; extras
ficam marcados como stretch.

### Feature 0 — Validar a skill (pré-requisito)
- [X] Rodar os 3 casos de teste sugeridos (novo curso, gerar aula, corrigir
      exercício) num vault real e conferir se os arquivos gerados batem com
      os formatos de referência.
- [X] Ajustar `skill/references/*` com o que aparecer de divergente na prática.
- **Entrega:** um curso de exemplo real no vault, servindo de fixture para o
  parser (Feature 1).

### Feature 1 — `course-parser` (fundação)
- [X] Setup do pacote com `uv`, `ruff`, `pytest`.
- [X] Models Pydantic: `Course`, `Module`, `Topic` (com `topic-meta`),
      `Subtopic`, `Lesson`, `ExerciseSet`, `Attempt`.
- [X] Parser de `00-curriculum.md` → `Course` (front matter + blocos
      `topic-meta` + checkboxes de subtópico).
- [X] Parser de arquivos de aula e de exercício/tentativa.
- [X] Testes com o curso de exemplo da Feature 0 como fixture.
- **Entrega:** `course-parser` convertendo o vault real em JSON estruturado
  via um script de linha de comando simples (sem servidor ainda).

### Feature 2 — `local-server` (API mínima)
- [X] Setup do FastAPI importando `course-parser`.
- [X] `GET /courses` — lista cursos no `storage.root` configurado.
- [ ] `GET /courses/{slug}` — cronograma completo estruturado.
- [ ] `GET /courses/{slug}/lessons/{topic_id}` e
      `GET /courses/{slug}/exercises/{topic_id}` — conteúdo bruto (Markdown)
      + metadados.
- [ ] Config simples (`.env` ou arquivo) apontando para o vault.
- **Entrega:** API rodando em `localhost`, testável via Swagger UI do
  próprio FastAPI, servindo os dados do curso de exemplo.

### Feature 3 — Esqueleto do frontend
- [ ] Setup Vite + React + TS + Tailwind + shadcn/ui.
- [ ] Geração dos tipos TS a partir do OpenAPI do `local-server`.
- [ ] TanStack Query configurado, hooks básicos (`useCourses`, `useCourse`).
- [ ] Roteamento básico: lista de cursos → página do curso.
- **Entrega:** app rodando, mostrando a lista de cursos vinda da API (sem
  trilha visual ainda — só prova que a ponta a ponta funciona).

### Feature 4 — Trilha interativa
- [ ] Integrar `@xyflow/react` + layout automático (`elkjs`/`dagre`).
- [ ] Transformar módulos/tópicos em nós e edges (prerequisito → sequência).
- [ ] Cor/ícone do nó por `status` (pending/in_progress/completed/review).
- [ ] Clique no nó abre painel lateral com os subtópicos e link para a aula.
- **Entrega:** a trilha visual estilo roadmap.sh, navegável, refletindo o
  estado real do cronograma.

### Feature 5 — Página de aula e exercícios
- [ ] Renderização de Markdown com `react-markdown` + Shiki.
- [ ] Página de aula com navegação anterior/próximo pela ordem do cronograma.
- [ ] Página de exercícios (sem correção pela UI ainda — só leitura).
- **Entrega:** fluxo completo de navegação: trilha → tópico → aula →
  exercícios, tudo lendo o vault real através da API.

### Stretch (pós-protótipo)
- [ ] SSE / `watchfiles` para atualização em tempo real quando a skill gera
      algo novo (sem precisar dar F5).
- [ ] Write-back de progresso pela UI.
- [ ] Empacotamento Tauri.
- [ ] Publicar `course-parser` no PyPI como pacote independente.

## Setup do ambiente

- Lint/format de Python: `ruff`, configurado em `packages/course-parser/pyproject.toml`
  (`[tool.ruff]`) e aplicado via `.pre-commit-config.yaml` na raiz
  (`astral-sh/ruff-pre-commit`).
- O hook de pre-commit **não é versionado** (`.git/hooks/` fica fora do repo) —
  qualquer pessoa clonando o projeto precisa rodar, uma vez:

  ```sh
  uv tool install pre-commit   # instala o CLI globalmente via uv
  pre-commit install           # registra o hook em .git/hooks/pre-commit
  ```

  Sem isso, o commit ainda funciona, mas sem o lint automático.

## Convenções gerais
- Comentários e nomes de variáveis em código: inglês, sempre.
- Toda escrita em Markdown gerada (pela skill ou pelo app) precisa continuar
  válida como nota Obsidian comum — sem HTML, sem sintaxe proprietária.
- Mudanças no formato de `topic-meta`, front matter de aula/exercício, ou no
  contrato de API do adapter `remote`, precisam ser refletidas nos três
  lugares ao mesmo tempo: `skill/references/*`, models do `course-parser`, e
  tipos gerados do frontend — eles são a mesma spec em três formatos.
