# course-builder (StudyTRON 3000)

Projeto open source de geração e visualização de cursos de estudo estruturados.
Uma **skill do Claude** gera cursos em Markdown num vault; um **app local**
(FastAPI + React) lê e mostra esse vault. Caminha para virar um SaaS, com
self-host via clone do repositório.

**Especificação técnica completa (arquitetura, contrato do vault, rotas,
modelos, roadmap): [`docs/SPEC.md`](docs/SPEC.md).** Leia-a antes de mexer em
qualquer parte do sistema. Planos de features pontuais: `docs/specs/`.

## Regras que valem sempre

- **O vault Markdown é a única fonte de verdade.** A skill escreve; o servidor
  e o app leem. Nenhum lado guarda estado fora do vault.
- **Storage adapter:** nunca assuma "é arquivo". Acesso a dados passa pelo
  adapter (`local` hoje, `remote` no futuro).
- **Spec em três formatos.** Mudou `topic-meta`, front matter de aula/exercício
  ou o contrato de API? Atualize **juntos**: `skill/references/*`, models do
  `course-parser` e tipos gerados do frontend (`npm run generate:types` em
  `apps/web`, commitando `openapi.json` + `schema.d.ts`).
- **Markdown gerado precisa ser nota Obsidian válida:** sem HTML, sem sintaxe
  proprietária. Edições de estado no currículo são cirúrgicas (só o bloco
  `topic-meta` / checkbox), nunca regenerar o arquivo.
- **Tipos não se duplicam:** Pydantic → OpenAPI → `openapi-typescript`.
  O frontend importa tipos via `@app/api/client`, nunca direto de `schema.d.ts`.

## Convenções de código

- Identificadores e comentários em **inglês**, sempre; documentação e conversa
  em pt-BR.
- Todo texto de UI passa por `t()` / `<Trans>` (i18next). Ao adicionar uma
  string, crie a chave em `en.json` **e** `pt-BR.json` e rode
  `npm run check:i18n`. Valores enviados à API e conteúdo do vault não são
  traduzidos.
- Python: `uv` para pacotes, `ruff` (aspas simples, linha 100), `pytest`.
  É o primeiro projeto Python open source do Samuel — explique a razão das
  mudanças em Python, não só o que mudou.
- Frontend: imports respeitam a capitalização exata do arquivo no Git
  (`tsc` acusa divergência de caixa até no Windows); aliases `@app`, `@ui`,
  `@router`.
- Commits: Conventional Commits (validados pelo `commitlint`).
- shadcn/ui: o `components.json` está em `apps/web`. Antes de qualquer
  `add`/`docs`/`search`, rode `npx shadcn@latest info --cwd apps/web` e passe
  `--cwd apps/web` nos comandos.

## Verificar antes de dar por concluído

```sh
# frontend (em apps/web)
npm run typecheck && npm run lint && npm run check:i18n

# Python (na raiz)
uv run pytest
uv run ruff check packages/course-parser && uv run ruff format --check packages/course-parser
```

Mudou models Pydantic ou rotas? Regere os tipos TS (`npm run generate:types`).

## Setup

- Python: `uv sync` na raiz. Frontend: Node 22+, `npm install` em `apps/web`
  (não faz parte do workspace `uv`).
- Hook de pre-commit **não é versionado**; após clonar, uma vez:
  `uv tool install pre-commit && pre-commit install`.
- Rodar tudo: `./run.sh`, ou ver "Como rodar" em `docs/SPEC.md`.
