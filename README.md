# StudyTRON 3000

Gere cursos de estudo estruturados com um agente de código e estude-os num app local.

Uma **skill** (`course-builder`) pede ao agente que escreva o curso em Markdown numa pasta
(o *vault*), e o **app** (FastAPI + React) lê essa pasta e mostra a trilha, as aulas e os
exercícios. O vault é a única fonte de verdade: cada curso é um conjunto de notas Markdown
que também abre no Obsidian.

## Como funciona

1. Você descreve o que quer aprender e o agente gera o **esqueleto** do curso: módulos,
   tópicos e subtópicos.
2. Aulas e exercícios são gerados **sob demanda**, tópico a tópico, pelo app.
3. Você acompanha o progresso e marca o status de cada tópico.

Agentes suportados: **Claude Code** e **Antigravity**. A escolha fica em *Configurações*,
onde também dá para testar se o agente está instalado e trocar a pasta dos cursos.

## Como rodar

Pré-requisitos: [uv](https://docs.astral.sh/uv/), Node 22+ e pelo menos um agente
instalado (`claude` ou `agy`).

```sh
uv sync
cd apps/client && npm install && cd ../..
./run.sh
```

O servidor sobe em `http://localhost:8000` (docs em `/docs`) e o app em
`http://localhost:3000`. Para começar, aponte a pasta dos cursos na tela de *Configurações*
ou defina `VAULT_PATH` no `.env` de `apps/local-server`.

### Instalar a skill no agente

- **Claude Code:** copie a pasta `skill/` para `~/.claude/skills/course-builder`.
- **Antigravity:** ele não lê `~/.claude/skills`. Empacote a skill como plugin (uma pasta com
  `plugin.json` contendo `{"name": "course-builder"}` e a pasta `skill/` copiada para
  `skills/course-builder`) e rode `agy plugin install <pasta>`.

## Estrutura

| Pasta | O que é |
| --- | --- |
| `skill/` | a skill `course-builder` |
| `packages/course-parser/` | modelos e leitura do vault |
| `apps/local-server/` | API FastAPI que lê o vault e roda o agente |
| `apps/client/` | app React |
| `docs/` | especificação técnica (`docs/SPEC.md`) e planos de features |

## Contribuindo

Leia [`docs/SPEC.md`](docs/SPEC.md) e o [`CLAUDE.md`](CLAUDE.md) antes de mexer no código.
Os commits seguem Conventional Commits.
