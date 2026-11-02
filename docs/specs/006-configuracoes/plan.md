# Plan: Feature 8 — Tela de configurações

> **Status: a fazer.** Plano escrito em 2026-10-31. Especificação de origem:
> [`docs/SPEC.md`](../../SPEC.md), seção 9 (a entrada da Feature 8 entra no Passo 12).
> Segue o formato de [`004-feedback-de-jobs`](../004-feedback-de-jobs/plan.md).

## Contexto

Hoje o app só sabe gerar conteúdo com o Claude Code, e isso está fixo no código
(`tool="claude"` em `routes/courses.py`, lista de ferramentas em `LocalProcess`). O caminho
do vault vem só do `.env`, e tema e idioma têm seletores pequenos no header, sem lugar
próprio. O Samuel também tem a CLI do Antigravity instalada e quer escolher qual agente gera
os cursos, aulas e exercícios.

A Feature 8 cria uma **tela de configurações** (`/settings`) com:

1. **Agente de código**: Claude Code ou Antigravity, com um botão que **testa** se o agente
   está instalado.
2. **Pasta do vault**: onde os cursos são salvos.
3. **Tema**: claro, escuro ou sistema, as três opções lado a lado.
4. **Idioma**: dropdown.
5. **Informações do projeto**: botão que abre o `README.md`, link do repositório e, por
   último, link das redes do Samuel.

**Entrega:** o aluno escolhe o agente, confere que ele existe antes de gerar qualquer coisa,
e a geração de curso, aula e exercícios passa a usar o agente escolhido.

**Fora do escopo:**

- Escolher o **modelo** dentro do agente (Sonnet, Gemini Flash etc.). Por enquanto só o
  agente; o `agy models` mostra que isso é possível depois (decisão do Samuel, 2026-10-31).
- Instalar o agente pelo app. O teste só avisa que falta e diz qual instalar.
- Outros agentes além de Claude Code e Antigravity. O desenho deixa a porta aberta (um
  registro de agentes), mas o `gemini` CLI, por exemplo, não entra.
- Configurações por curso e contas de usuário.
- Seletor nativo de pastas (ver "Decisões de design").

## Estado de partida

| Peça | Situação | Onde |
| --- | --- | --- |
| `LocalProcess` | só conhece `claude`; `args_for_tool` levanta `ValueError` para o resto | `apps/local-server/src/local_server/services/local_process.py` |
| `extract_result` | lê só o JSON do Claude (`result` + `is_error`) | mesmo arquivo |
| Chamadas ao agente | duas, com `tool="claude"` fixo | `routes/courses.py` (`_run_course_creation`, `_run_generation`) |
| `env.VAULT_PATH` | lido do `.env` na importação; os testes trocam o atributo com `monkeypatch` | `config/env.py`, `routes/courses.py` |
| `GET /vault/config` | devolve o caminho; o frontend não usa | `routes/vault.py` |
| Tema | `ThemeProvider` com `localStorage` (`studytron:theme`) | `app/context/ThemeContext.tsx` |
| Idioma | `SUPPORTED_LANGUAGES` e `i18n.changeLanguage` | `app/i18n/index.ts` |
| Seletores no header | `LanguageSelector` e `ThemeSelector`, menus pequenos | `ui/components/` |
| `Markdown` | renderiza Markdown com Shiki; reaproveitável para o README | `ui/components/Markdown.tsx` |
| README na raiz | **não existe** ainda | — |

## O que a CLI real mostrou (verificado em 2026-10-31)

| | Claude Code | Antigravity |
| --- | --- | --- |
| Executável | `claude` (v2.1.312) | `agy` (v1.2.9), **não** `antigravity` |
| Modo sem interação | `-p <prompt>` | `-p <prompt>` |
| Saída JSON | `--output-format json` | `--output-format json` |
| Sem pedir permissão | `--dangerously-skip-permissions` | `--dangerously-skip-permissions` |
| Forma do JSON | `{"result": "...", "is_error": false}` | `{"status": "SUCCESS", "response": "...", "conversation_id": ..., "usage": ...}` |
| Teste de existência | `claude --version` | `agy --version` |

O ponto que muda o desenho: **os flags são iguais, a saída não**. Cada agente precisa do
seu próprio leitor de resultado. Antes do Passo 1, conferir como o `agy` sinaliza erro (o
campo `status` com outro valor?) rodando um caso que falhe, e registrar aqui.

## Decisões de design (e por quê)

| Decisão | Escolha | Motivo |
| --- | --- | --- |
| Onde guardar as configurações | **arquivo JSON no servidor**, na pasta de configuração do usuário (`platformdirs.user_config_dir("studytron")`), escrita atômica (`write_text_atomic`, que já existe) | O vault é a fonte de verdade do **estudo**; configuração do app não pode morar nele (o caminho do vault não poderia estar dentro do próprio vault). Não é estado de estudo, então a regra do CLAUDE.md não é violada. *(Escolha minha.)* |
| Papel do `.env` | passa a ser só o **valor inicial** (`VAULT_PATH`); o arquivo de configurações vence quando existe | Quem já roda com `.env` não quebra |
| Agente | `Literal['claude', 'antigravity']` na API; nunca uma string livre de comando | O servidor executa o que está configurado, com `--dangerously-skip-permissions`; um campo livre viraria execução arbitrária |
| Registro de agentes | um módulo `services/agents.py` com, por agente: executável, montagem dos argumentos, leitor do resultado, nome para exibir e como instalar | Acaba com o `if self.tool == "claude"` espalhado; um terceiro agente vira uma entrada nova |
| Testar o agente | `shutil.which(executável)` e depois `<executável> --version` com timeout de 5 s; **não** gasta token | "Responde rápido" era o pedido; rodar um prompt de verdade custaria segundos e uso |
| Resultado do teste | `200` sempre, com `{available, version, error}`; o erro por falta de agente não é falha da rota | A tela precisa mostrar o aviso, não tratar como exceção de rede |
| Pasta do vault | campo para **colar o caminho** + lista dos caminhos já usados; o servidor valida (existe, é pasta) | O navegador não entrega o caminho real de uma pasta (`<input webkitdirectory>` e `showDirectoryPicker` escondem o caminho). Um diálogo nativo de pasta no servidor (tkinter) fica como evolução |
| Mudar a pasta com job rodando | recusa com `409` | O job grava no `cwd` antigo; trocar no meio confunde a checagem do arquivo gerado |
| Tema e idioma | **continuam no navegador** (`localStorage`), a tela só ganha controles novos | São preferência do aparelho, não do servidor; não há motivo para ida e volta à API |
| Seletores do header | permanecem, além da tela nova | Trocar tema rápido sem sair da página continua útil. *(Escolha minha; se preferir só na tela de configurações, é remover dois componentes.)* |
| README do projeto | rota do servidor lê o `README.md` da raiz do repositório; `404` se não existir; o frontend mostra com `Markdown` num diálogo | O app roda por clone do repositório, então o arquivo está ao lado do servidor |
| Link das redes | por último, depois do resto estável | Pedido do Samuel |

## Passos

Cada passo termina com testes passando e a verificação do CLAUDE.md. Os passos 1 a 5 são
backend; 6 a 11 são frontend.

### Passo 1 — Registro de agentes e leitor de resultado por agente

Refatora o que já existe, sem mudar o comportamento do Claude.

- Criar `services/agents.py`: `AgentId`, uma definição por agente (executável, `build_args(prompt)`,
  `parse_result(stdout)`, nome, texto de instalação).
- `extract_result` vira o `parse_result` do Claude; o do Antigravity lê `response` e trata
  `status != "SUCCESS"` como erro (confirmar o formato de erro, ver acima).
- `LocalProcess` recebe o `AgentId`, resolve o executável com `shutil.which` (no Windows isso
  acha `.exe` e `.cmd`) e levanta um erro claro, `AgentNotInstalledError`, se não achar.
- Testes: os dois formatos de saída (sucesso, JSON inválido, erro), executável ausente, e os
  testes atuais de `LocalProcess` ainda passando.

**Pronto quando:** `uv run pytest` verde e nenhuma mudança visível no app.

### Passo 2 — Armazenamento das configurações

- `services/settings_store.py`: lê e grava o JSON (`agent`, `vault_path`, `recent_vault_paths`),
  com escrita atômica e valores padrão (agente `claude`, vault do `.env`).
- Arquivo ausente ou corrompido cai nos padrões sem derrubar o servidor (e registra no log).
- Os testes trocam o local do arquivo por `tmp_path` na `conftest.py`, como já fazem com o
  vault, para nunca tocar nas configurações reais.
- `routes/courses.py` e `existing_slugs.py` passam a pedir o vault ao `settings_store` em vez
  de `env.VAULT_PATH`; ajustar a fixture `vault_dir` da `conftest.py`.

**Pronto quando:** os testes de rotas atuais passam usando o novo armazenamento.

### Passo 3 — Rotas de configurações

- `GET /settings` → `{agent, vault_path, recent_vault_paths}`.
- `PATCH /settings` → campos opcionais. `agent` validado pelo `Literal`. `vault_path` validado
  (existe, é pasta, caminho absoluto); `422` com a razão se não. `409` se há job ativo.
- `GET /agents` → lista dos agentes suportados com nome e texto de instalação (os textos
  moram no servidor para o frontend não duplicar).
- Remover (ou deixar como alias) `GET /vault/config`, que ninguém consome.
- Testes: validação, `409` com job rodando, persistência entre duas instâncias do store.

**Pronto quando:** Swagger UI mostra e altera as configurações.

### Passo 4 — Teste do agente

- `POST /agents/{agent_id}/check` → `{available, version, error}`.
- `shutil.which` primeiro (sem processo); se achar, `--version` com timeout de 5 s.
- Sem o executável: `available=false` e `error` com o nome do agente e como instalar.
- Testes com `shutil.which` e `subprocess` simulados: achou, não achou, timeout, código de
  saída diferente de zero.

**Pronto quando:** a rota responde em milissegundos para os dois agentes na máquina do
Samuel, e mostra o erro certo com o `PATH` sem eles.

### Passo 5 — Gerar com o agente escolhido

- As duas chamadas em `courses.py` usam o agente de `settings_store`.
- Se o agente não estiver instalado, a rota de geração recusa **antes** de criar o job
  (`422`, com a mensagem de instalação), em vez de criar um job que falha na hora.
- Revisar `prompts.py`: o texto fala em "Claude"? O prompt precisa funcionar nos dois
  agentes, e a skill `course-builder` precisa estar acessível ao `agy` (**verificar**:
  o `agy` enxerga `~/.claude/skills`, ou tem pasta própria? Ver "Questões abertas").
- Testes: a geração chama o agente configurado; recusa quando ausente.
- Regerar os tipos TS: `npm run generate:types` em `apps/client`, commitando
  `openapi.json` e `schema.d.ts`.

**Pronto quando:** um curso é gerado de verdade pelo `agy` num vault de teste.

### Passo 6 — Esqueleto da tela

- Rota `/settings` (com `lazy`), ícone de engrenagem no header, `SettingsPage` com as cinco
  seções vazias (títulos e descrições) e link de volta.
- Hooks `useSettings`, `useUpdateSettings` e queries em `api/queries.ts`.
- Chaves em `en.json` e `pt-BR.json`; `npm run check:i18n`.

### Passo 7 — Seção "Agente"

- Dropdown (`DropdownMenu` já existe no projeto) com os agentes de `GET /agents`.
- Botão "Testar agente": estado de carregando, depois sucesso (com a versão) ou erro
  (com o aviso de instalação). Testa ao trocar de agente também.
- Aviso visível quando o agente salvo não está instalado.

### Passo 8 — Seções "Tema" e "Idioma"

- Tema: três botões lado a lado (claro, escuro, sistema) usando `useTheme`; o selecionado
  fica marcado.
- Idioma: dropdown com `SUPPORTED_LANGUAGES`.
- Sem rota nova; nada vai ao servidor.

### Passo 9 — Seção "Pasta dos cursos"

- Campo de texto para colar o caminho e botão "Salvar"; mostra o erro de validação do
  servidor.
- Lista dos caminhos recentes (`recent_vault_paths`) para trocar com um clique.
- Mostra o caminho atual. Desativa a edição, com o motivo, enquanto há job ativo.

### Passo 10 — Seção "Sobre o projeto"

- `GET /project/readme` no servidor (`404` se não houver `README.md`).
- Botão "Ler o README" abre um diálogo com `Markdown`; sem README, o botão mostra que não
  existe. Criar um `README.md` básico na raiz do repositório, já que hoje não há.
- Link do repositório: `https://github.com/shmach/studytron_3000`, com
  `rel="noopener noreferrer"`.

### Passo 11 — Link das redes (último)

- Preencher quando o Samuel informar os endereços. Fica separado para não bloquear o resto.

### Passo 12 — Fechamento

- Atualizar `docs/SPEC.md`: seção 9 (Feature 8), seção 10 (pontos de atenção abaixo), seção 2
  (estrutura de `docs/specs/`) e a nota sobre `GET /vault/config`.
- Atualizar o `CLAUDE.md` se "Rodar tudo" ou o `.env` mudarem.
- Rodar a verificação completa:

```sh
# frontend (em apps/client)
npm run typecheck && npm run lint && npm run check:i18n

# Python (na raiz)
uv run pytest
uv run ruff check packages/course-parser apps/local-server && uv run ruff format --check packages/course-parser apps/local-server
```

## Questões abertas

1. **A skill chega ao `agy`?** A skill `course-builder` mora em `~/.claude/skills`. Se o
   `agy` não a lê dali, a geração com Antigravity não funciona sem outra instalação. Ver no
   Passo 5 antes de continuar; se for preciso, o plano ganha um passo "instalar a skill
   para o Antigravity".
2. **Formato de erro do `agy`** (Passo 1).
3. **`platformdirs` como dependência nova** do `local-server`, ou usar `Path.home()` com
   uma pasta própria? *(Meu palpite: `platformdirs`, pelo comportamento correto em Windows,
   macOS e Linux.)*

## Pontos de atenção que a feature cria

- `PATCH /settings` deixa quem fala com o servidor apontar o `cwd` do agente (que roda com
  `--dangerously-skip-permissions`) para qualquer pasta. O CORS limita a origens locais, e
  o app continua sendo de uso local; para o SaaS, isso precisa de outro desenho.
- As configurações vivem fora do vault e fora do Git. Quem troca de máquina recomeça nos
  padrões.

## Registro

- **Passo 1 (2026-10-31):** entregue. `services/agents.py` com o registro e um leitor de
  resultado por agente; `LocalProcess` resolve o executável com `shutil.which` e levanta
  `AgentNotInstalledError`. Formato de erro do `agy` confirmado: `status: "ERROR"` com o
  motivo em `error`, e código de saída 1. O `ruff format` do `apps/local-server` usa aspas
  duplas, apesar de o `CLAUDE.md` dizer aspas simples.
- **Passo 2 (2026-10-31):** entregue. `services/settings_store.py` (`Settings`, `SettingsStore`,
  singleton `settings_store`), arquivo em `platformdirs.user_config_dir("studytron")`. Questão
  aberta 3 resolvida: `platformdirs` entrou como dependência. `courses.py`, `existing_slugs.py`
  e `GET /vault/config` leem o vault do store (`VAULT_PATH` vira só o valor de reserva);
  `config/env.py` foi removido por ter ficado sem uso. Nos testes, a fixture automática
  `isolated_settings` aponta o store para um arquivo temporário e esquece `VAULT_PATH`.
- **Passo 3 (2026-11-01):** entregue. `routes/settings.py` (`GET` e `PATCH /settings`) e
  `routes/agents.py` (`GET /agents`). `PATCH` valida o caminho do vault (absoluto, existe, é
  pasta; `422` com o motivo) e recusa a troca de vault com `409` se há job ativo, via
  `JobStore.has_active()`; trocar só o agente é permitido. A checagem de job ativo e a gravação
  não são atômicas, aceitável para uso local. `GET /vault/config` e `routes/vault.py` foram
  removidos. Tipos TS regerados.
- **Passo 4 (2026-11-01):** entregue. `services/agent_check.py` (`check_agent`, `AgentCheck`) e
  `POST /agents/{agent_id}/check`, sempre `200`. `shutil.which` primeiro (sem processo), depois
  `--version` com timeout de 5 s; executável ausente, timeout, falha ao iniciar e código de
  saída diferente de zero viram `available=false` com a mensagem. Medido nesta máquina:
  `claude` em ~0,05 s e `agy` em ~1,7 s (a CLI do Antigravity demora para iniciar, então a
  tela deve mostrar o estado de carregando). Tipos TS regerados.
- **Passo 5 (2026-11-02), código:** entregue. As duas chamadas ao agente em `courses.py` usam o
  agente de `settings_store`, lido na hora do pedido e passado ao job (o mesmo agente roda e
  tem o resultado lido). Gerar curso, aula ou exercícios com o agente ausente recusa com `422`
  (mensagem de instalação) antes de criar o job; `resolve_executable` em `local_process.py`
  serve a rota e o `LocalProcess`. `prompts.py` já era neutro (não cita Claude). A fixture
  automática `agents_installed` tira dos testes a dependência do `PATH` da máquina.
- **Questão aberta 1 resolvida:** o `agy` **não** lê `~/.claude/skills`. Também não leu um
  `~/.gemini/config/skills.json` global nem uma pasta `~/.gemini/config/skills/` (junction).
  O que funcionou foi empacotar a skill como plugin e instalar pelo próprio `agy`:
  `plugin.json` (`{"name": "course-builder"}`) + `skills/course-builder/`, depois
  `agy plugin install <pasta>`, que copia para `~/.gemini/config/plugins/course-builder`.
  Isso é uma **segunda cópia** da skill: ao mudar a de `~/.claude/skills`, reinstalar.
  Sem `--dangerously-skip-permissions`, o `agy` responde `SUCCESS` com `response` vazio e
  `denied_actions`; o servidor sempre passa o flag, então não afeta o app.
- **Passo 5, instruções da skill:** cada agente tem um `skill_install_hint` (em `agents.py`,
  exposto por `GET /agents`) dizendo como instalar a skill do jeito dele: copiar `skill/` para
  `~/.claude/skills/course-builder` no Claude Code; empacotar como plugin e rodar
  `agy plugin install` no Antigravity. A tela (Passo 7) mostra o texto. A geração real pelo
  `agy` num vault de teste já foi feita pelo Samuel, então o passo está concluído.
- **Passo 6 (2026-11-02):** entregue. Rota `/settings` (com `lazy`), engrenagem no header e
  `SettingsPage` com as cinco seções vazias (título e descrição) e link de volta. Tipos
  `Settings`, `SettingsUpdate`, `AgentId`, `AgentInfo` e `AgentCheck` em `api/client.ts`; em
  `api/queries.ts`, `settingsQuery`, `agentsQuery` (`staleTime: Infinity`), `updateSettings` e
  `checkAgent`; hooks `useSettings`, `useAgents` e `useUpdateSettings` (grava a resposta no
  cache e invalida os cursos, pois outro vault tem outros cursos). Chaves `settings.*` em
  `en.json` e `pt-BR.json`. Conferido no navegador pelo Samuel.
- **Passo 7 (2026-11-02):** entregue. `AgentSettings` (dropdown dos agentes de `GET /agents`,
  botão "Testar agente", resultado e as instruções de instalação da skill, `skill_install_hint`)
  dentro da seção "Agente". O teste é uma **query** (`agentCheckQuery`, hook `useAgentCheck`),
  não uma mutation: roda sozinha ao abrir a tela e ao trocar de agente (chave por agente), e o
  botão só chama `refetch()`. Sem refetch ao focar a janela, porque o `agy` leva ~2 s. Durante
  o teste aparece "Testando…", nunca o resultado de uma rodada anterior. Trocar o agente grava
  na hora (`PATCH /settings`); falha vira toast. Conferido no navegador pelo Samuel.
- **Passo 8 (2026-11-02):** entregue. `ThemeSettings` (três botões lado a lado, claro, escuro e
  sistema, num `radiogroup`; o escolhido fica preenchido) e `LanguageSettings` (dropdown que
  mostra o idioma em uso), ambos nas seções da `SettingsPage`. Usam `useTheme` e
  `i18n.changeLanguage`; nada vai ao servidor. Reaproveitam as chaves `theme.*` e `language.label`,
  então não houve texto novo. Os seletores do header permanecem.
- **Passo 9 (2026-11-02):** entregue. `VaultSettings`: mostra a pasta em uso, campo para colar o
  caminho com "Salvar", erro do servidor (`422` com o motivo) logo abaixo e a lista de pastas
  recentes (sem a atual), cada uma trocável com um clique. Com job ativo (`useJobs({active:
  true})`) o campo, o botão e a lista ficam desativados, com o motivo na tela, espelhando o
  `409` do servidor. O campo começa vazio (a pasta atual aparece acima), o que evita sincronizar
  estado com efeito. Ao trocar de pasta o `useUpdateSettings` já invalida a lista de cursos.
- **Passo 10 (2026-11-02):** entregue, com escopo menor que o planejado. Criado o `README.md`
  da raiz (em pt-BR: o que é, como funciona, como rodar, como instalar a skill por agente,
  estrutura). `AboutSettings` mostra só o link do repositório (`rel="noopener noreferrer"`); **Mudança de rota:** a
  rota `GET /project/readme` e o diálogo com o README foram feitos e depois removidos, porque
  os links relativos do README (`docs/SPEC.md` etc.) davam "página não encontrada" dentro do
  app. O README fica para quem abre o repositório.
