# Plan: Feature 7 — Feedback de jobs e decisões pendentes

> **Status: em andamento.** Passos 1 a 3 entregues em 2026-10-25; faltam o Passo 4 (checklist
> com a CLI real) e o Passo 5 (concorrência). Criado ao encerrar a Feature 6:
> reúne os Passos 11 a 13 do plano
> [`003-progresso-do-aluno`](../003-progresso-do-aluno/plan.md) e os pontos que
> ficaram adiados. Especificação de origem: [`docs/SPEC.md`](../../SPEC.md), seção 9,
> "Feature 7 — Feedback de jobs e decisões pendentes".

## Contexto

Hoje o aluno gera uma aula ou os exercícios pelo app e vê o progresso **na página do
tópico**. Se sair dessa página, não vê mais nada: não há aviso de que o job começou ou
terminou, nem lugar que mostre o que está rodando. E quando uma aula é gerada com o
tópico anterior ainda `in_progress`, a skill não pode perguntar se ele foi concluído
(não há ninguém para responder); o servidor já devolve essa dúvida em
`pending_decisions`, mas nenhuma tela a mostra.

A Feature 7 dá ao aluno três coisas:

1. um **painel**, na tela inicial, com os jobs em andamento;
2. **toasts** quando um job começa e quando termina;
3. um **diálogo** que pergunta o que fazer com cada decisão de status pendente.

**Entrega:** o aluno acompanha os jobs de qualquer tela, é avisado do resultado e
responde às decisões pendentes pelo app; o fluxo completo foi conferido de ponta a ponta
em um vault de teste.

**Fora do escopo:**

- Histórico de jobs, exibido ou persistido. O painel mostra só o que está rodando e
  esquece o job ao terminar; o resultado chega pelo toast. O `JobStore` continua em
  memória.
- Notificações do sistema operacional (push) e e-mail. Só toast dentro do app.
- Cancelar um job em andamento e regerar aula ou exercícios que já existem.
- Persistir as decisões pendentes: elas vivem no job (em memória) e voltam a ser pedidas
  na próxima geração de aula.
- Marcar checkboxes de subtópicos e `last_reviewed` ao concluir um tópico pelo app
  (decisões 1 e 3 da Feature 6, mantidas).

## Estado de partida (o que a Feature 6 já deixou pronto)

| Peça | Situação | Onde |
| --- | --- | --- |
| `GET /jobs` (lista, filtros `slug` e `active`) | pronta | `apps/local-server/src/local_server/routes/jobs.py` |
| `Job` com `kind`, `topic_id`, `error` e `pending_decisions` | pronto; `output` fica fora da API | `services/job_store.py` |
| Decisões pendentes já validadas contra o currículo | prontas, só em jobs de aula | `services/pending_decisions.py` |
| Tipos TS regerados (`Job`, `PendingDecision`, `JobKind`) | prontos | `apps/client/src/app/api/schema.d.ts` |
| `jobsQuery` e `useJobs` (consulta a cada 2 s enquanto há job rodando) | prontos | `apps/client/src/app/api/queries.ts`, `app/hooks/useJobs.ts` |
| `useGeneration` (inicia, acompanha e invalida ao fim do job) | pronto | `apps/client/src/app/hooks/useGeneration.ts` |
| `useUpdateTopicStatus` e a rota `PATCH` de status | prontos | `app/hooks/useUpdateTopicStatus.ts` |
| Biblioteca de toast | **não existe** no frontend | — |
| `AppLayout` | já envolve todas as telas; é onde o observador e o diálogo entram | `apps/client/src/ui/components/AppLayout.tsx` |

## Decisões de design (e por quê)

Decididas pelo Samuel em 2026-10-25, durante a Feature 6.

| Decisão | Escolha | Motivo |
| --- | --- | --- |
| Painel de jobs | Componente `JobsPanel` na tela inicial, com **apenas os jobs em andamento** (`pending` ou `running`), de todos os tipos. Sem histórico: o job some ao terminar. Esconde-se quando não há jobs | Mostra o que está rodando sem abrir cada curso. O resultado chega pelo toast, então manter jobs terminados na tela só geraria ruído |
| Notificações | Toast (`sonner`, via shadcn) quando um job **começa** e quando **termina** (sucesso ou erro). Uma única fonte: um observador global que compara o estado dos jobs entre consultas | Um observador no layout vê jobs iniciados em qualquer tela, inclusive em outra aba (ao voltar o foco). A primeira consulta só registra o estado, sem avisar, para não notificar jobs que já estavam rodando |
| Frequência da consulta | A cada 2 s enquanto houver job ativo; fora isso, só ao focar a janela e logo depois de iniciar uma geração | Não gasta requisições à toa com o servidor ocioso e ainda pega jobs iniciados em outro lugar |
| Diálogo de decisão | Um `Dialog` do shadcn, global no `AppLayout`, aberto pelo observador quando um job de **aula** termina com `pending_decisions` | Funciona mesmo se o aluno saiu da tela da aula. Cada opção chama a rota de status. Não há decisão automática: sem resposta, nada muda |
| Tipos de job | Painel e toasts cobrem **todos** os tipos, inclusive a criação de curso | Um aviso de fim de job também serve a quem saiu da tela de criação de curso. O diálogo de criação mantém o acompanhamento que já tem |

## Estrutura de arquivos

```
apps/client/src/
  app/hooks/useJobsWatcher.ts          compara estados e dispara os toasts (e o diálogo)   (novo)
  ui/components/ui/Sonner.tsx          Toaster do shadcn, ligado ao tema do projeto        (novo)
  ui/components/JobsPanel.tsx          painel de jobs em andamento                          (novo)
  ui/components/PendingStatusDialog.tsx                                                     (novo)
  ui/components/AppLayout.tsx          monta o Toaster, o observador e o diálogo            (modifica)
  ui/pages/CoursesPage.tsx             monta o JobsPanel                                    (modifica)
  app/i18n/locales/{en,pt-BR}.json     chaves do painel, dos toasts e do diálogo            (modifica)
```

## Passos

| # | Passo | Depende de | Verificação |
| --- | --- | --- | --- |
| 1 | Painel de jobs na tela inicial e toasts | — (Feature 6) | **feito**; `typecheck`, `lint`, `check:i18n`, navegador com CLI simulada |
| 2 | Diálogo de decisão pendente | 1 | **feito**; idem. Falta conferir com a saída real da skill |
| 3 | Decidir o comportamento no timeout depois de o arquivo ser escrito | — | **feito** (opção A); testes de servidor com CLI simulada |
| 4 | Teste manual de ponta a ponta | 1, 2 | a fazer; checklist abaixo |
| 5 | Testes de concorrência (etapa própria, depois dos demais) | 1 a 4 | a fazer; roteiro abaixo |

### Passo 1 — Painel de jobs e toasts

**O que fazer:**

1. **Toast.** Antes de qualquer `add`, rodar `npx shadcn@latest info --cwd apps/client`
   (regra do CLAUDE.md) e então adicionar o componente `sonner` com `--cwd apps/client`.
   Isso instala uma dependência nova (`sonner`). O componente do shadcn assume
   `next-themes`; ajustá-lo para o seletor de tema do projeto (claro, escuro, sistema), e
   salvá-lo como `Sonner.tsx`, respeitando a capitalização dos outros arquivos de
   `ui/components/ui/`. Montar o `<Toaster />` em `AppLayout`.
2. **Painel.** Novo componente `JobsPanel`, montado em `CoursesPage`, usando `useJobs()`.
   Mostra **somente os jobs em andamento**. Cada linha traz o tipo e o alvo ("Aula 1.2 —
   Java para quem já programa", "Exercícios 1.2", "Criação de curso"), o tempo decorrido
   e um link para o curso. Assim que o job termina, a linha some. O painel se esconde
   quando não há jobs. Os nomes de curso e de tópico vêm dos cursos que a página já
   carrega.
3. **Observador de notificações.** Novo hook `useJobsWatcher`, montado em `AppLayout`
   (vale para qualquer tela). Guarda o estado anterior de cada job pelo `id` e compara a
   cada consulta:
   - job novo em `pending` ou `running` → toast **"Geração iniciada"**;
   - job que passou a `done` → toast de sucesso, com ação "Abrir" (aula, exercícios ou
     curso);
   - job que passou a `error` → toast de erro com a mensagem do job.
   A **primeira** consulta só registra o estado, sem avisar, para não notificar jobs que
   já estavam rodando ao abrir o app.
4. **Cuidado com a sobreposição.** O `useGeneration` já invalida o curso, a aula e os
   exercícios quando o job ativo some da lista. Se o observador passar a fazer isso
   também, tirar a lógica de um dos dois lugares para não duplicar.
5. Textos em `en.json` e `pt-BR.json`, e `npm run check:i18n`.

**Por quê:**

- Um observador no layout, e não em cada página, é a única forma de avisar do fim de um
  job quando o aluno já está em outra tela.
- Uma só fonte de eventos (a comparação de estados do observador) evita avisos
  duplicados, por exemplo um toast de início vindo do botão e outro vindo do observador.
- Começar sem avisar na primeira consulta evita uma enxurrada de toasts ao abrir o app
  com jobs já em andamento.
- `sonner` é o componente de toast que o shadcn já oferece; segue o padrão do projeto em
  vez de uma implementação própria.

**Verificação:** `typecheck`, `lint`, `check:i18n` e navegador, **com um vault de teste**
(ver "Como verificar a interface sem tocar no vault real"). O ciclo completo (início,
progresso, fim) precisa de um job real, ou de um job simulado que termina sozinho. Para
ver o toast de **erro** sem gastar uso da CLI, iniciar o servidor com um `PATH` em que o
`claude` não exista: a geração falha na hora e o job vira `error`.

### Passo 2 — Diálogo de decisão pendente

**O que fazer:**

1. Criar `PendingStatusDialog`, um `Dialog` do shadcn com uma pergunta por decisão
   (`PendingDecision`: id e título do tópico) e três opções: "Concluí" (`completed`),
   "Quero revisar" (`review`), "Ainda estou estudando" (`in_progress`, sem chamada se já
   estiver assim).
2. Montar o diálogo em `AppLayout` e abri-lo pelo observador do Passo 1 quando um job de
   **aula** passar a `done` com `pending_decisions`. As decisões vêm do job que acabou de
   terminar; se o aluno fechar o app, a decisão volta a ser pedida na próxima geração.
3. Cada opção chama a rota de status (`useUpdateTopicStatus`) e, depois, tira a decisão
   da lista do diálogo.
4. Sem resposta, nada muda. O diálogo **não** tem "fechar = concluir".

**Por quê:** a decisão de concluir é do aluno, não do LLM. Um diálogo que assumisse
"concluir" por padrão quebraria essa regra. Usar `Dialog` (Radix) já cuida de foco e ESC.
Montá-lo no layout, e não na página da aula, faz a pergunta aparecer mesmo se o aluno
saiu da tela enquanto a aula era gerada.

**Atenção:** o seletor de status da página de aula fica inativo enquanto há job ativo no
curso, para não competir com a escrita da skill. O diálogo só abre quando o job de aula
**já terminou**, então a mudança de status que ele faz não colide com essa escrita.

**Verificação:** `typecheck`, `lint`, `check:i18n`, e navegador com saída real da skill
(tópico 1.1 em `in_progress`, gerar a aula do 1.2 em um vault de teste).

### Passo 3 — Timeout depois de o arquivo ser escrito

**Problema:** o timeout de 300 s vale para o processo da CLI. Se ele demorar a encerrar
depois de escrever a aula ou os exercícios, o job vira `error` mesmo com o arquivo
gravado. Em uma verificação isolada a CLI levou mais de 3 min para encerrar, com os
arquivos prontos cerca de 2 min depois do início; nas demais execuções reais o job levou
de 43 s a cerca de 90 s.

**Decisão a tomar** (nenhuma recomendação fechada ainda): ao estourar o timeout, o
servidor confere o curso recarregado antes de marcar erro. *Opção A:* se o arquivo
existe, marcar `done`. *Opção B:* manter `error`, mas com a mensagem de que o arquivo
existe. *Opção C:* deixar como está. A opção A é a mais útil ao aluno; o custo é aceitar
um arquivo que o agente pode não ter terminado de escrever.

**Se a decisão for A ou B:** o `LocalProcess.run` precisa distinguir o timeout (hoje
levanta `RuntimeError`), e `_run_generation` passa a conferir `produced(curso)` também
nesse caminho. Teste com a CLI simulada: timeout com arquivo gravado e timeout sem
arquivo.

### Passo 4 — Teste manual de ponta a ponta

Checklist, com um vault de teste (não o vault real), cobrindo a Feature 6 e a Feature 7:

- [ ] Marcar `pending → completed` pela aula; o arquivo mudou só na linha `status`.
- [ ] Marcar `in_progress` em tópico sem aula: opção inativa; chamar a rota direto devolve `409`.
- [ ] Gerar a aula pelo app: o progresso aparece, o job vai de `pending` a `running` a `done`, a aula aparece e o ícone do card na trilha muda sem recarregar.
- [ ] Gerar os exercícios pelo app, em um tópico com aula: mesmo comportamento.
- [ ] Na página de exercícios de um tópico sem aula: botão inativo, com o aviso e o link para a aula.
- [ ] Durante uma geração, todos os botões de gerar e o seletor de status do curso ficam inativos; um segundo `POST` direto na API devolve `409`.
- [ ] Recarregar a página durante uma geração: o progresso reaparece.
- [ ] O painel da tela inicial lista o job em andamento e **some** quando ele termina, sem histórico.
- [ ] Toast de início ao disparar uma geração e toast de fim ao terminar, inclusive com o aluno em outra tela. Abrir o app com um job já rodando **não** dispara toast de início.
- [ ] Toast de erro quando a geração falha (servidor iniciado sem o `claude` no `PATH`), com a mensagem do job.
- [ ] A saída da skill traz `Pending status decision`; o diálogo abre; cada opção muda o status; fechar sem responder não muda nada.
- [ ] Editar o `00-curriculum.md` com CRLF; a rota de status preserva CRLF.
- [ ] Anotar o tempo real de uma aula e de um conjunto de exercícios, para confirmar se os 300 s bastam.

Rodar antes de encerrar, como manda o CLAUDE.md:

```sh
# frontend (em apps/client)
npm run typecheck && npm run lint && npm run check:i18n

# Python (na raiz)
uv run pytest
uv run ruff check packages/course-parser apps/local-server && uv run ruff format --check packages/course-parser apps/local-server
```

### Passo 5 — Testes de concorrência

Etapa própria, **depois** de toda a implementação (decisão do Samuel em 2026-10-25). Hoje
a trava de um job por curso só tem testes de unidade (`JobStore` e rotas com CLI
simulada). O roteiro:

- duas gerações ao mesmo tempo no mesmo curso: uma `202`, a outra `409`;
- duas gerações em cursos diferentes ao mesmo tempo: as duas seguem;
- mudança de status durante uma geração (pela API direto, já que a UI bloqueia);
- duas abas do app abertas, uma gerando e a outra tentando gerar ou mudar status;
- edição do `00-curriculum.md` no Obsidian durante a escrita da skill;
- reinício do servidor com um job em andamento (o job some; a geração pode ser repetida
  sem corromper o currículo);
- muitas requisições de `PATCH` de status em paralelo no mesmo arquivo.

O critério é **nenhum arquivo corrompido e nenhum job preso em `running`**.

## Como verificar a interface sem tocar no vault real

Usado na Feature 6 e reaproveitável aqui:

1. Copiar um curso para uma pasta temporária (por exemplo,
   `packages/course-parser/tests/fixtures/java-para-quem-programa`).
2. Subir um segundo `local-server` com `VAULT_PATH` apontando para a cópia, e um segundo
   Vite com `VITE_API_BASE_URL` apontando para esse servidor. O CORS libera as portas 3000
   e 5173 do **Vite**; a porta do servidor pode ser qualquer uma (a 8001 já estava
   ocupada na máquina do Samuel).
3. Para um job que **termina sozinho** sem gastar a CLI, subir o servidor por um script
   curto que cria um job e o conclui depois de alguns segundos (também escrevendo o
   arquivo de aula, se for testar a atualização da tela).
4. Para um job real, esperar de 1 a 2 minutos e **não** deixar o servidor ser parado antes
   de o job acabar.

## Registro da implementação (2026-10-25)

- **Timeout (Passo 3):** Samuel escolheu a opção A. `CliTimeoutError` (subclasse de
  `RuntimeError`) sai de `LocalProcess.run`; `_run_generation` confere `produced(curso)`
  também nesse caminho. Sem arquivo, o erro é a mensagem do timeout mais "no lesson/exercises
  for topic X was written". A resposta do agente se perde com o processo morto, então uma
  aula concluída assim não tem `pending_decisions`.
- **`Job.created_at`:** não estava no plano. O painel precisava do tempo decorrido e o
  contrato não tinha timestamp. Campo novo, UTC, opcional no TS (tem valor padrão).
- **`sonner` e `Dialog`:** o registro do shadcn não estava acessível no ambiente de
  desenvolvimento, então `Sonner.tsx` e `Dialog.tsx` foram escritos à mão no formato do
  shadcn (o `Sonner` usa o `ThemeContext` do projeto, sem `next-themes`). O pacote `sonner`
  entrou por `npm install`. Se quiser, rode `npx shadcn@latest add sonner dialog --cwd
  apps/client --diff` para comparar.
- **Painel:** lê a lista de jobs **sem filtro** (a mesma consulta do observador) e filtra
  `pending`/`running` no cliente, para não abrir uma segunda requisição.
- **Diálogo:** os botões ficam inativos enquanto há job ativo no curso (mesma regra do
  `StatusSelect`); fechar o diálogo descarta as perguntas restantes sem mudar status.
- **`useGeneration`:** perdeu o efeito que invalidava o curso ao fim do job (passo 4 da
  seção do Passo 1); isso agora é só do `useJobsWatcher`.
- **Verificação feita:** `uv run pytest` (203 testes), `ruff`, `typecheck`, `lint`,
  `check:i18n`; navegador (Playwright) contra o servidor real com a CLI substituída por uma
  simulação lenta: toast de início, painel com tempo decorrido, toast de fim, painel
  esvaziando, diálogo, ESC sem mudar status, "Concluí" mudando só a linha `status`, toast de
  erro e recarga no meio de um job sem toast de início.

## Decisões em aberto

Nenhuma. A do Passo 3 foi tomada (opção A).

## Riscos

- **Excesso de notificações.** Com jobs de todos os tipos e vários cursos, os toasts
  podem se acumular. Mitigação: a primeira consulta não avisa, e há uma trava de um job
  por curso. Se ainda incomodar, restringir os toasts de início aos jobs iniciados pela
  própria aba.
- **Nova dependência no frontend.** O toast traz o `sonner`. Adicionar pelo `shadcn` (com
  `--cwd apps/client`) e conferir o ajuste ao tema do projeto.
- **Avisos duplicados ou perdidos.** O observador depende de comparar estados entre
  consultas: um job que começa e termina entre duas consultas (2 s, ou só ao focar a
  janela quando ocioso) pode não gerar o toast de início. Aceitável; o toast de fim vem
  da próxima consulta.
- **Edição de status durante a escrita da skill.** O lock do `PATCH` não alcança o
  processo da CLI. A UI desabilita o seletor durante um job; quem edita o Obsidian à mão
  continua sujeito ao risco.
- **Efeito colateral da CLI no vault.** A CLI pode gravar `.claude/model-roles.json`
  dentro do `VAULT_PATH`, por causa de um hook do ambiente do usuário. Anterior a estas
  features; não corrigido.
