# StudyTRON 3000 (course-builder) — Especificação técnica

Documento de referência técnica do projeto. Descreve **o que existe hoje** no
repositório (varredura do código em 2026-10-10), as decisões de arquitetura e o
que ainda falta. Instruções de trabalho para agentes de IA ficam em `CLAUDE.md`;
planos de features pontuais ficam em `docs/specs/<nnn-feature>/`.

## 1. Visão geral

Projeto open source para geração e visualização de cursos de estudo estruturados
sobre qualquer tema (programação, mecatrônica, idiomas…). Nasce como evolução do
estudo pessoal do Samuel e caminha para ser a base de um SaaS (cursos
hospedados, com opção de self-host via clone do repositório).

Três partes desacopladas por um contrato de storage:

| Parte | Onde | Papel |
| --- | --- | --- |
| Skill de agente de IA | `skill/` | Gera o curso (esqueleto + aulas + exercícios sob demanda) e escreve Markdown no vault |
| Parser | `packages/course-parser/` | Converte o Markdown do vault em modelos Pydantic |
| Servidor local | `apps/local-server/` | FastAPI sobre o parser; expõe o vault via HTTP e dispara a criação de cursos |
| Frontend | `apps/client/` | React + Vite; lista cursos, mostra o currículo, cria e apaga cursos |

**Regra central:** os arquivos Markdown no vault são a única fonte de verdade.
A skill escreve; o servidor/app lê (e apaga cursos inteiros). Nenhum lado guarda
estado que não esteja no vault. O vault precisa continuar sendo um conjunto de
notas Obsidian válidas (sem HTML, sem sintaxe proprietária).

## 2. Arquitetura

```
 Agente de IA ─────────(skill course-builder)──▶  VAULT (pasta de Markdown)
                                                        ▲
 apps/client (React) ──HTTP──▶ apps/local-server (FastAPI) ─┤ lê via course-parser
        ▲                          │                    │
        └── tipos TS gerados ◀─ OpenAPI                 └─ cria curso: subprocess do CLI do agente
```

### Storage adapter

A skill e o servidor nunca assumem "é arquivo": passam por um adapter
(`storage.adapter` em `config.yaml`).

- `local` (hoje): lê/escreve sob `storage.root` / `VAULT_PATH`.
- `remote` (planejado, SaaS): mesmo contrato sobre HTTP — `GET /courses`,
  `GET/PUT /courses/<slug>/<path>` com Markdown cru, API key via variável de
  ambiente cujo **nome** vai em `storage.remote.api_key_env`. O servidor local
  implementa o mesmo recorte de rotas, de modo que o frontend fala com ele como
  falará com a API hospedada. Detalhes em `skill/references/storage-adapters.md`.

### Estrutura do monorepo

```
studytron_3000/
  skill/                         Skill course-builder (SKILL.md, references/, assets/)
  packages/course-parser/        Python: Markdown -> Pydantic (src/course_parser, tests/)
  apps/local-server/             Python: FastAPI (src/local_server, main.py)
  apps/client/                     React + Vite + TS (Node, fora do workspace uv)
  docs/
    SPEC.md                      este arquivo
    specs/001-web-app-i18n/      plano da internacionalização do client (concluído)
    specs/002-interactive-trail/ plano da Feature 4, trilha interativa (encerrada com escopo reduzido)
  run.sh                         sobe servidor + frontend juntos
  pyproject.toml                 workspace uv: packages/* e apps/local-server
  CLAUDE.md                      instruções para agentes de IA
```

`.claude/` e `.agents/` (skills de dev: shadcn, migrate-radix-to-base) constam
no `.gitignore`, mas seus arquivos continuam rastreados; `skills-lock.json`
trava as versões.

## 3. Contrato de dados do vault

Formato definido pela skill (`skill/references/*`). É a mesma spec em três
formatos — **ao mudar qualquer campo, atualizar juntos**: `skill/references/*`,
models do `course-parser` e tipos gerados do frontend.

### Layout em disco

```
<courses_root>/                       (= VAULT_PATH)
  config.yaml                         defaults globais (skill/assets/config-template.yaml)
  <course-slug>/
    config.yaml                       overrides opcionais por curso
    00-curriculum.md                  esqueleto + progresso (fonte de verdade)
    lessons/<topic-id>-<slug>.md
    exercises/<topic-id>-<slug>.md            conjunto de exercícios
    exercises/<topic-id>-attempt-<n>.md       tentativa + correção
```

Slugs em kebab-case ASCII. Um diretório só é considerado curso se contiver
`00-curriculum.md`.

### `00-curriculum.md`

Front matter (YAML): `course`, `slug`, `created` (data ISO), `depth`
(`quick|standard|deep`), `level`, `goal`, `language` (ex. `pt-BR`).

Corpo:

- `# Título` e um blockquote `> …` com a visão geral do curso.
- Módulos: `## Module N — <nome>` (travessão **—**), seguido de 1–2 linhas de
  descrição.
- Tópicos: `### N.M <nome>`, sempre com um bloco ` ```topic-meta ` (YAML):

  | Campo | Valores |
  | --- | --- |
  | `id` | string igual ao id do heading (`"1.1"`) |
  | `status` | `pending` \| `in_progress` \| `completed` \| `review` |
  | `perceived_difficulty` | vazio \| `easy` \| `ok` \| `hard` |
  | `weak_points` | lista de strings curtas |
  | `last_reviewed` | data ISO ou vazio |

- Subtópicos: `- [ ] **N.M.K <nome>** — <2–3 linhas de escopo>` (`[x]` quando
  concluído). Linhas seguintes não vazias continuam a descrição.

Semântica de `status` (progresso **do aluno**, não da geração): `pending` não iniciado,
padrão de todo tópico, inclusive sem aula gerada; `in_progress` aula gerada e o aluno
está estudando (a skill define ao escrever a aula); `completed` aluno confirmou que
concluiu (a skill pergunta ao gerar a próxima aula, ou o aluno edita à mão); `review`
aluno quer revisar ou tentativas acusaram lacunas, próxima aula abre com reforço.
Um tópico só pode ser `in_progress` se a aula existir. Ao gerar uma aula, a skill
verifica se há tópicos `in_progress` e pergunta se foram concluídos, viram `review`
ou continuam em andamento.

Profundidade escala a quantidade: `quick` 3–4 módulos × 2–3 tópicos; `standard`
5–7 × 3–4; `deep` 8+ × 4–5. Atualizações de estado editam **só** o bloco
`topic-meta` e o checkbox correspondentes, nunca regeneram o arquivo (preserva
edições manuais do Obsidian).

### Aulas — `lessons/<topic-id>-<slug>.md`

Front matter: `course`, `topic`, `title`, `generated`, `covers` (lista de ids de
subtópicos). Corpo livre em Markdown: seção opcional "Quick review" (reforço de
`weak_points`), "Where we are", uma seção por subtópico, "Key takeaways",
"What's next". Sem perguntas de follow-up dentro do arquivo.

### Exercícios — `exercises/<topic-id>-<slug>.md`

Front matter: `course`, `topic`, `generated`, `difficulty_target` (1–5, começa em
2 e se ajusta pelo histórico). Seções Warm-up, Core, Challenge. **Sem
respostas** no arquivo.

### Tentativas — `exercises/<topic-id>-attempt-<n>.md`

Front matter: `course`, `topic`, `attempt` (int), `date`, `score` (string, ex.
`"4/7"`), `result` (`good|mixed|weak`), `weak_points`. Corpo: item a item com
resposta do usuário, veredito, feedback e resposta de referência. A correção
atualiza `perceived_difficulty`, `weak_points` e `status` no currículo.

### Loop de reforço

Correção de exercícios escreve `weak_points` no currículo; a próxima aula do
tópico relacionado abre com uma seção de revisão rápida antes do conteúdo novo.

### Fluxo da skill (5 workflows)

Novo curso (pergunta só profundidade/nível/objetivo, gera o currículo, **nenhuma
aula**), gerar aula, gerar exercícios, corrigir tentativa, progresso/revisão.
Sempre relê `00-curriculum.md` antes de agir — nunca confia na memória da
conversa.

## 4. `packages/course-parser`

Python ≥ 3.13, Pydantic v2 + PyYAML. Núcleo compartilhado entre o servidor local
e, no futuro, as Lambdas do SaaS (mesma linguagem do backend serverless já
planejado — daí a escolha de Python). **Somente leitura**, exceto
`delete_course`.

### Modelos (`models.py`)

| Modelo | Campos |
| --- | --- |
| `TopicMeta` | `id`, `status` (default `pending`), `perceived_difficulty \| None`, `weak_points=[]`, `last_reviewed \| None` |
| `Subtopic` | `id`, `title`, `description`, `completed=False` |
| `Topic` | `meta: TopicMeta`, `title`, `subtopics` |
| `Module` | `title`, `description`, `topics` |
| `Course` | `course`, `slug`, `created`, `depth`, `level`, `goal`, `language`, `overview`, `modules` |
| `Lesson` | `course`, `topic`, `title`, `generated`, `covers`, `content` |
| `ExerciseSet` | `course`, `topic`, `generated`, `difficulty_target`, `content` |
| `Attempt` | `course`, `topic`, `attempt`, `date`, `score`, `result`, `weak_points`, `content` |
| `CourseBundle` | `course`, `lessons`, `exercise_sets`, `attempts` |

### API pública

`parse_curriculum`, `parse_lesson`, `parse_exercise_set`, `parse_attempt`,
`parse_exercise_file` (decide set vs. attempt pela presença do campo `attempt`),
`list_course_dirs`, `load_course`, `load_vault`, `delete_course` (em
`course_parser.vault`), `main` (CLI).

### Comportamento relevante

- `load_course` ordena aulas/exercícios por id de tópico com chave numérica
  (`1.10` depois de `1.2`) e tentativas por `(tópico, attempt)`.
- Arquivos `.md` iniciados por `.` são ignorados.
- Erros de parse são `ValueError` com o caminho do arquivo; curso sem
  `00-curriculum.md` é `FileNotFoundError`.
- Regras que o parser faz cumprir: front matter obrigatório; todo tópico precisa
  de `topic-meta`; o id do heading tem que bater com o `id` do `topic-meta`.
- `delete_course` recusa diretórios sem `00-curriculum.md` (`shutil.rmtree`).
- Normaliza CRLF → LF antes do parse.

### CLI

```sh
uv run course-parser <pasta-do-curso-ou-raiz> [--compact]
```

JSON em stdout (datas ISO, `ensure_ascii=False`); erros em stderr, exit 1.

### Testes

`packages/course-parser/tests/`: `test_models`, `test_frontmatter`,
`test_curriculum`, `test_content_parsers`, `test_vault`, `test_cli`. Fixtures
reais gerados pela skill em `tests/fixtures/` (`arduino-cpp`,
`java-para-quem-programa`) — **funcionam como spec que o parser deve continuar
aceitando**. Rodar: `uv run pytest` na raiz.

## 5. `apps/local-server`

FastAPI (`fastapi[standard]`) + `python-dotenv`, importa o `course-parser`.

### Configuração

| Variável | Uso |
| --- | --- |
| `VAULT_PATH` | caminho absoluto da raiz dos cursos; vem do ambiente ou de `apps/local-server/.env` |

Centralizada na classe `Env` (`config/env.py`). Sem `VAULT_PATH`, rotas de curso
respondem 500.

### Rotas

| Método e rota | operation_id | Retorno / efeito |
| --- | --- | --- |
| `GET /vault/config` | `get_vault_config` | `VAULT_PATH` configurado (`str \| null`) |
| `GET /courses` | `list_courses` | `CourseBundle[]` |
| `GET /courses/{slug}` | `get_course` | `CourseBundle` (404 se não existe) |
| `DELETE /courses/{slug}` | `delete_course` | 204; apaga a pasta do curso |
| `GET /courses/{slug}/lessons/{topic_id}` | `get_lesson` | `Lesson` |
| `GET /courses/{slug}/exercises/{topic_id}` | `get_exercise_set` | `ExerciseSet` |
| `POST /courses?user_prompt=…` | `create_course` | `CourseCreationJob` (`user_prompt` é *query param*) |
| `GET /courses/jobs/{job_id}` | `get_course_creation_job` | `CourseCreationJob` |

`slug` vazio, `.`, `..` ou contendo `/` ou `\` vira 404 (proteção contra sair
do vault). Documentação interativa em `http://localhost:8000/docs`.

### Criação de curso (jobs)

1. `POST /courses` valida o prompt e o `VAULT_PATH`, cria um job `pending` e
   agenda `_run_course_creation` em `BackgroundTasks`.
2. A tarefa marca `running`, guarda o conjunto de pastas do vault, e roda
   o CLI do agente em modo headless (hoje só o Claude Code está implementado:
   `claude -p <prompt> --output-format json --dangerously-skip-permissions`)
   com `cwd=VAULT_PATH` (`LocalProcess`, via `asyncio.to_thread(subprocess.run)`,
   timeout de 300 s).
3. O prompt embrulha o pedido do usuário instruindo a skill `course-builder` a
   operar de forma não interativa (inferir defaults em vez de perguntar).
4. Ao terminar, o slug do novo curso é detectado pela **diferença** entre as
   pastas antes/depois; o job vira `done` (com `slug`) ou `error` (com mensagem).

`JobStatus`: `pending | running | done | error`. `JobStore` é um dicionário em
memória — jobs somem ao reiniciar o servidor.

### CORS e execução

CORS liberado para `http://localhost:3000` e `http://localhost:5173`, métodos
`GET`, `POST`, `DELETE`. Entrada: `apps/local-server/main.py` (re-exporta
`app`); `uv run local-server` roda uvicorn com reload em `127.0.0.1:8000`.

### Contrato OpenAPI

`uv run export-openapi --out apps/client/openapi.json` grava
`app.openapi()`; o frontend gera os tipos a partir dele (seção 6.5).

## 6. `apps/client`

React 19 + Vite 8 + TypeScript 5.9, Tailwind v4, shadcn/ui (Radix), React
Router 8, TanStack Query 5, `openapi-fetch`, i18next. Node 22+; **fora** do
workspace uv.

### 6.1 Aliases e estrutura

Aliases (em `tsconfig.app.json` e `vite.config.ts`): `@app/*` → `src/app/*`,
`@ui/*` → `src/ui/*`, `@router/*` → `src/router/*`.

```
src/
  main.tsx, App.tsx                providers: QueryClient, ThemeProvider, RouterProvider
  router/index.tsx                 rotas
  app/
    api/ client.ts queries.ts schema.d.ts(gerado)
    context/ThemeContext.tsx
    hooks/   useCourses useCourse useCreateCourse useCourseJob useDeleteCourse useDebounce useIsMobile
    i18n/    index.ts i18next.d.ts locales/{en,pt-BR}.json
    lib/     progress.ts courseSearch.ts query-client.ts utils.ts
  ui/
    components/  AppLayout, LanguageSelector, ThemeSelector, CourseQuestionnaireDialog,
                 DeleteCourseDialog, error-state, status-badge,
                 trail/ (Trail, ModuleSection, TopicCard, statusStyle)
    components/ui/  primitivas shadcn (AlertDialog, DropdownMenu, Input, Textarea,
                    badge, button, card, skeleton, questionnaire)
    pages/       CoursesPage, CoursePage, not-found-page
    styles/index.css
```

> Arquivos em `components/ui/` têm capitalização mista (`Input.tsx`,
> `button.tsx`). Imports precisam bater **exatamente** com o nome no Git — o
> `tsc` acusa diferença de caixa mesmo no Windows.

### 6.2 Rotas

| Path | Componente | Conteúdo |
| --- | --- | --- |
| `/` | `CoursesPage` | busca (debounce, sem acentos), lista de cursos, estado vazio com criação via questionário |
| `/courses/:slug` | `CoursePage` | metadados, progresso, visão geral, trilha do currículo (módulos → tópicos coloridos por status), exclusão |
| `*` | `NotFoundPage` | 404 |

Todas dentro de `AppLayout` (header com seletores de idioma e tema + `<Outlet/>`).

### 6.3 Camada de dados

- `api/client.ts`: cliente `openapi-fetch` tipado (`paths` do `schema.d.ts`),
  base URL `VITE_API_BASE_URL` (default `http://localhost:8000`), aliases de tipo
  (`CourseBundle`, `Topic`, `TopicStatus`…) e `ApiError(status, message)`.
  O resto do app **não** importa de `schema.d.ts` diretamente.
- `api/queries.ts`: `courseKeys` (fábrica de query keys), `unwrap` (normaliza
  `{data,error,response}` em data-ou-throw), `coursesListQuery`,
  `courseDetailQuery`, `courseJobQuery` (polling de 2 s até `done`/`error`),
  `createCourseJob`, `deleteCourse` (204 sem corpo).
- `lib/query-client.ts`: `staleTime` 30 s, `retry` 1.
- `lib/progress.ts`: `computeProgress(course)` → totais por status e percentual
  de tópicos `completed`.

### 6.4 Fluxos

- **Criar curso:** busca sem resultado → `CourseQuestionnaireDialog` (nível,
  profundidade, objetivo, ênfase, idioma) → monta prompt em inglês
  (`Create a course about: …`, `Student level:`, `Depth:`, …) → `POST /courses`
  → polling do job → ao `done`, invalida `courseKeys.list()`.
- **Excluir curso:** `DeleteCourseDialog` (AlertDialog) → `DELETE` → volta a `/`.
- **Progresso exibido:** `% = completed / total tópicos`; badges por status e
  presença de aula/exercícios por tópico.

### 6.5 Tipos gerados

```sh
cd apps/client && npm run generate:types
```

Roda `uv run export-openapi --out openapi.json` e `openapi-typescript` →
`src/app/api/schema.d.ts`. Ambos (`openapi.json` e `schema.d.ts`) são
**versionados** juntos, para um clone novo compilar sem o servidor no ar.
Regerar sempre que models Pydantic ou rotas mudarem.

### 6.6 Internacionalização

`i18next` + `react-i18next` + `i18next-browser-languagedetector`.

- Base/fallback `en`; tradução `pt-BR` em
  `src/app/i18n/locales/{en,pt-BR}.json` (objeto `translation` único).
- Detecção: `localStorage['studytron:language']`, depois `navigator`; a escolha
  é persistida. `<html lang>` acompanha `i18n.resolvedLanguage`.
- Chaves tipadas via `i18next.d.ts` (typo em chave quebra o `tsc`).
- `LanguageSelector` no header; nomes nativos fixos ("English", "Português").
- `npm run check:i18n` falha se os catálogos divergirem em chaves.
- **Fora de escopo da tradução:** conteúdo do vault (fica no idioma gerado),
  valores enviados à API (`beginner`, `hands-on practice`, status do
  `topic-meta`) — só os *rótulos* são traduzidos. Detalhes do plano:
  `docs/specs/001-web-app-i18n/plan.md`.

### 6.7 Tema

`ThemeProvider` com `light | dark | system`, persistido em
`localStorage['studytron:theme']`, aplica a classe no `<html>`.

## 7. Tooling e qualidade

| Área | Ferramenta | Detalhe |
| --- | --- | --- |
| Python | `uv` | workspace na raiz; `.python-version`; `uv.lock` |
| Python lint/format | `ruff` | config em `packages/course-parser/pyproject.toml` (linha 100, aspas simples, regras `E,F,I,UP,B`), rodado via `.pre-commit-config.yaml` |
| Python testes | `pytest` | grupo `dev` do workspace |
| JS lint/format | `oxlint` + `prettier` | `lint-staged` nos arquivos staged |
| Commits | `commitlint` (conventional) | hook `commit-msg` do husky |
| Hooks | husky + pre-commit | `.husky/pre-commit` roda `uvx pre-commit run` e `lint-staged`; o hook do pre-commit **não é versionado** em `.git/hooks` |

Setup único do pre-commit após clonar:

```sh
uv tool install pre-commit
pre-commit install
```

Scripts do client: `dev`, `build` (`tsc -b && vite build`), `preview`, `typecheck`
(`tsc -b`), `lint` (`oxlint`), `generate:types`, `check:i18n`.

Verificação padrão antes de entregar mudança no client: `npm run typecheck`,
`npm run lint`, `npm run check:i18n`. No Python: `uv run pytest`,
`uv run ruff check`, `uv run ruff format`.

## 8. Como rodar

Tudo junto (bash): `./run.sh` — sobe `fastapi dev apps/local-server/main.py` em
`:8000` e `npm run dev` do client (exige `apps/client/node_modules`).

Separado:

```sh
uv sync
VAULT_PATH=/caminho/do/vault uv run fastapi dev apps/local-server/main.py   # :8000
cd apps/client && npm install && npm run dev                                # Vite
```

> `vite.config.ts` fixa a porta do dev server em **3000**; `run.sh` e os READMEs
> ainda citam 5173. O CORS aceita as duas.

## 9. Estado atual e roadmap

### Concluído

| Item | Observação |
| --- | --- |
| Skill `course-builder` | 5 workflows, formatos em `skill/references/`; validada com cursos reais |
| `course-parser` | modelos, parsers, loader do vault, CLI, testes com fixtures reais |
| `local-server` | leitura de cursos/aulas/exercícios, exclusão, criação por job, CORS, export OpenAPI |
| Frontend base | Vite + Tailwind + shadcn, tipos gerados, TanStack Query, roteamento |
| Lista e detalhe de curso | busca, progresso, visão geral |
| Trilha do currículo | Feature 4 (escopo reduzido): timeline em `CoursePage`, substitui a lista antiga; o clique no card leva à página de aula |
| Página de aula | Feature 5 (parcial): `LessonPage` com Markdown + Shiki, detalhes do tópico, navegação anterior/próximo, estados de carregamento/erro/aula não gerada; carregada com `lazy` no router. Falta a página de exercícios e os badges nos cards |
| Criar/excluir curso pela UI | questionário → job → polling |
| i18n EN + pt-BR | plano `001` concluído |
| Tema claro/escuro/sistema | |

### Histórico do protótipo (Features 0–3, todas entregues)

| Feature | Escopo | Entrega |
| --- | --- | --- |
| 0 — Validar a skill | 3 casos de teste (novo curso, gerar aula, corrigir exercício) num vault real; ajuste de `skill/references/*` | Curso real no vault, usado como fixture do parser |
| 1 — `course-parser` | Setup com `uv`/`ruff`/`pytest`; models; parser de currículo, aulas e exercícios/tentativas; testes sobre o curso real | Vault real convertido em JSON estruturado via CLI |
| 2 — `local-server` | FastAPI importando o parser; listar cursos, currículo, aula e exercício; config do vault via `.env` | API em `localhost`, testável pelo Swagger UI |
| 3 — Esqueleto do frontend | Vite + React + TS + Tailwind + shadcn; tipos gerados do OpenAPI; TanStack Query; roteamento lista → curso | App mostrando dados da API ponta a ponta |

### Etapas futuras de desenvolvimento

Cada etapa entrega um incremento demonstrável. Escopo mínimo primeiro; extras
marcados como *stretch*.

#### Feature 4 — Trilha interativa (estilo [roadmap.sh](https://roadmap.sh/frontend)) — encerrada

Encerrada com escopo reduzido (decisão de 2026-10-19). O que foi entregue é o
componente de timeline; o painel lateral, a alternância Trilha / Lista e a
legenda dedicada foram **descartados** (detalhes de tópico ficam na página de
aula da Feature 5; a legenda já existe em `CoursePage` com `StatusBadge` +
contagens). React Flow foi avaliado e descartado por ser um canvas com
zoom/arrastar. Histórico em `docs/specs/002-interactive-trail/plan.md`.

- [x] Timeline vertical em HTML/CSS (`ui/components/trail/`): módulos na
      espinha, tópicos em grade responsiva logo abaixo.
- [x] Cor/ícone do card por `status` (`pending` / `in_progress` / `completed` /
      `review`), lidos de `Topic.meta.status` (`statusStyle.ts`).
- [~] Painel lateral com subtópicos: **descartado** (vai para a página de aula).
- [~] Alternância Trilha / Lista em `?view=`: **descartada**.

A `Trail` já está montada em `CoursePage` e **substituiu** a lista de cards
antiga (removida; não há alternância). O clique no card agora navega para a
aula (Feature 5). Com a lista removida, `CoursePage` perdeu os badges de "tem
aula / tem exercícios" por tópico, que a Feature 5 ainda precisa recolocar no
`TopicCard`.

Notas de design:

- O currículo **não tem campo estruturado de pré-requisito**; relações do tipo
  "builds on 2.3" aparecem só em prosa. A trilha não desenha setas: a ordem do
  currículo é a ordem da página. Pré-requisitos explícitos exigiriam novo campo
  em `topic-meta` (atualizar skill, parser e tipos TS).
- Todos os dados vêm de `GET /courses/{slug}`; nenhuma rota nova.

#### Feature 5 — Página de aula e exercícios

- [~] Clique no card da trilha (`TopicCard`) navega para a aula do tópico
      (`app/lib/routes.ts`). **Falta:** indicar no card se há aula/exercícios
      (derivar de `bundle.lessons` / `exercise_sets` e passar por `Trail` →
      `ModuleSection` → `TopicCard`). Corrigir também o `<button>` dentro do
      `<Link>` (HTML inválido) e receber `slug` por prop em vez de `useParams`.
- [x] Renderização de Markdown com `react-markdown` + Shiki (syntax highlighting):
      `ui/components/Markdown.tsx` (GFM, tema claro/escuro via CSS variables,
      blocos sem linguagem caem em texto simples).
- [ ] *Pendência:* suporte a LaTeX inline (`$\rightarrow$`), usado em aulas do
      vault (ex.: `ai-engineer` 1.1) e hoje exibido como texto literal. Exigiria
      `remark-math` + `rehype-katex` + CSS do KaTeX.
- [x] Páginas de aula e exercícios importadas com `lazy` no router
      (`router/index.tsx`), para o Shiki não pesar no bundle da lista de cursos.
- [x] Página de aula (`ui/pages/LessonPage.tsx`) com navegação anterior/próximo
      pela ordem do currículo (`app/lib/topic.ts`). Mostra também os detalhes do
      tópico (subtópicos, weak points, dificuldade percebida), que antes iriam
      para um painel lateral. Trata carregamento, erro com retry, tópico
      inexistente e aula não gerada (404).
- [ ] Página de exercícios — **somente leitura**, sem correção pela UI.
      `ExercisesPage` hoje é um placeholder; `useExerciseSet` ainda não é usado.
- [ ] *Pendência:* links no Markdown — wikilinks `[[...]]` e links relativos
      para `.md` do vault aparecem quebrados; links externos sem
      `rel="noopener noreferrer"`.

**Entrega:** fluxo completo trilha → tópico → aula → exercícios, lendo o vault
real pela API.

Notas de design:

- Queries em `api/queries.ts` e hooks `useLesson` / `useExerciseSet` já
  existem; as rotas `lessons` e `exercises` estão em `router/index.tsx`.
- As rotas `GET /courses/{slug}/lessons/{topic_id}` e
  `GET /courses/{slug}/exercises/{topic_id}` já existem e retornam `Lesson` /
  `ExerciseSet` com o Markdown em `content`; o frontend já consome a de aula.
- `CourseBundle` já traz `lessons` e `exercise_sets`; os conjuntos de
  tópicos com aula/exercício se derivam de `lessons` / `exercise_sets`
  (`lessons.map(l => l.topic)`), base para os links e badges dos cards.
- A navegação anterior/próximo deve seguir a ordem módulo → tópico do
  currículo (a mesma usada para ordenar aulas no loader).
- Conteúdo do vault não é traduzido; só a casca da UI.
- Exercícios não contêm respostas; a correção continua sendo feita pela skill
  (o app só lê no MVP).

#### Feature 6 — Progresso do aluno pelo app

Status do tópico passa a ser marcado pelo aluno (manualmente no Obsidian ou pelo app).
A skill já documenta o modo não interativo ([skill/SKILL.md](../skill/SKILL.md), seção
"Interaction mode"); falta o lado do servidor e do app.

- [ ] Rota `PATCH /courses/{slug}/topics/{topic_id}/status`: altera só a linha `status`
      do bloco `topic-meta` em `00-curriculum.md`, sem regenerar o arquivo. Aceita só
      `pending | in_progress | completed | review`. Recusa `in_progress` se a aula do
      tópico não existir.
- [ ] Prompt de geração de aula no servidor declara o modo não interativo (a skill
      não pode perguntar com ninguém do outro lado).
- [ ] App lê as linhas `Pending status decision: <id> <título>` da saída da skill e mostra
      um diálogo com três opções (concluí / quero revisar / ainda estou estudando), que
      chamam a rota de PATCH. A decisão é do aluno e não passa pelo LLM.
- [ ] Rota de geração de aula (ainda não existe; hoje só a criação de curso roda a skill).

**Entrega:** o aluno muda o status de um tópico pelo app ou pelo Obsidian, e o app
reflete a mudança sem regenerar nenhum arquivo.

Notas de design:

- A correção de exercícios continua marcando `completed` quando o resultado é `good`
  ([skill/references/exercises-format.md](../skill/references/exercises-format.md)).
  Isso é aceito: o aluno pode sempre corrigir o status à mão.
- Edição concorrente com o Obsidian continua em aberto (ver "Decisões adiadas").

#### Stretch (pós-protótipo)

- [ ] **Atualização em tempo real:** `watchfiles` observando o vault + SSE do
      FastAPI, para o frontend refletir o que a skill gera sem F5. Hoje o app
      depende de `staleTime` (30 s), refetch no foco e do polling dos jobs.
- [ ] **Write-back de status pela UI:** rota `PATCH /courses/{slug}/topics/{topic_id}/status`
      alterando só a linha `status` do bloco `topic-meta` em `00-curriculum.md`. Escopo
      limitado a status; edição concorrente com o Obsidian continua em aberto (ver
      "Decisões adiadas").
- [ ] **Empacotamento desktop (Tauri)**.
- [ ] **Publicar `course-parser` no PyPI** como pacote independente.

### Decisões adiadas (não descartadas)

- **Write-back pela UI:** edição concorrente do mesmo arquivo que o usuário
  edita no Obsidian — só depois do resto estável.
- **Tauri:** alternativa/evolução ao servidor local + navegador.
- **File System Access API** (`showDirectoryPicker`): modo "zero instalação",
  só Chromium.
- **Backend do SaaS (AWS serverless):** reaproveita `course-parser` e o mesmo
  frontend; vem depois do app local provar o conceito.
- **Armazenamento em nuvem e sincronização entre dispositivos:** por enquanto o
  vault continua local e é a fonte de verdade, inclusive para progresso. Quando o
  SaaS for planejado, decidir: (a) separação conteúdo (bucket, imutável por versão)
  × progresso (banco por usuário com API de escrita); (b) provedor (AWS ou
  Cloudflare); (c) geração na máquina do usuário ou em worker; (d) destino do
  Obsidian (editor ou somente leitura); (e) autenticação e contas, pré-requisito
  para o app mobile sincronizar entre dispositivos.

## 10. Pontos de atenção conhecidos

- Criação de curso usa `--dangerously-skip-permissions` e executa o CLI
  do agente (hoje `claude`) no vault; adequado apenas para uso local/de confiança.
- `JobStore` em memória e detecção do slug por diff de pastas (vulnerável a
  criações simultâneas e a reinício do servidor).
- `create_course` recebe `user_prompt` como query string (prompts longos podem
  esbarrar em limites de URL).
- Resquícios de debug: `print` em `routes/courses.py`, `console.log(job)` e
  `TODO` de exibir erro de job em `CoursesPage.tsx`.
- `GET /vault/config` não é consumido pelo frontend.
- READMEs de `apps/client` e `apps/local-server` estão defasados (layout de
  `src/`, tabela de rotas, porta do Vite).
- `.specify/` (spec-kit) aparece deletado na árvore de trabalho (mudança ainda
  não commitada); planos de feature vivem em `docs/specs/`.
