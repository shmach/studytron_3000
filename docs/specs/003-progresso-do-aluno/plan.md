# Plan: Feature 6 — Progresso do aluno pelo app

> **Status: em andamento.** Passos 1 a 4 entregues. Em 2026-10-25 o plano foi
> ampliado duas vezes: a geração de **exercícios** e a **geração de aula e de
> exercícios pelo frontend** entraram no escopo (Passos 5, 6 e 10), e depois
> entraram o **painel de jobs na tela inicial** e as **notificações (toast)** de
> início e fim de job (Passo 11). Os passos seguintes foram renumerados.
> Especificação de origem: [`docs/SPEC.md`](../../SPEC.md), seção 9, "Feature 6
> — Progresso do aluno pelo app". O SPEC é atualizado no último passo.

## Contexto

Hoje o `status` de um tópico (`pending | in_progress | completed | review`) só
muda à mão no Obsidian ou pela skill, e aulas e exercícios só são gerados pela
skill, fora do app. O app é somente leitura. A Feature 6 fecha esse ciclo:

1. uma rota para alterar o status sem regenerar o arquivo;
2. a geração de aula e de exercícios pelo servidor, em modo não interativo;
3. a leitura, pelo app, das decisões pendentes que a skill devolve;
4. a interface: seletor de status; botões para gerar aula e exercícios, com o
   progresso do job; um painel com os jobs na tela inicial; notificações
   (toast) quando um job começa e quando termina; e um diálogo que pergunta ao
   aluno o que fazer com cada decisão pendente.

**Entrega:** o aluno gera a aula e os exercícios de um tópico, acompanha os jobs
na tela inicial e é avisado quando terminam, e muda o status do tópico pelo app
ou pelo Obsidian. O app reflete cada mudança sem regenerar nenhum arquivo.

**Fora do escopo:**

- Write-back com edição concorrente do Obsidian (continua em "Decisões
  adiadas" do SPEC). A rota de status escreve só a linha `status`, o que reduz
  a janela de conflito, mas não a elimina.
- Atualização em tempo real (SSE/`watchfiles`). Após uma mudança, o app
  invalida as queries; não há push.
- Pré-requisitos (`requires_all` / `requires_any`) e `optional: true`. São
  itens do Todoist, não desta feature.
- Correção de exercícios pela UI. Continua sendo papel da skill.
- Regerar uma aula ou um conjunto de exercícios que já existe, e cancelar um job
  em andamento. A geração só vale para o que ainda não existe (`409` caso
  contrário).
- Histórico de jobs, tanto exibido na tela quanto persistido. O painel mostra
  só o que está rodando e esquece o job ao terminar. O `JobStore` continua em
  memória (pendência já listada no SPEC) e guarda os jobs desta execução do
  servidor apenas para o observador de toasts descobrir o resultado.
- Notificações do sistema operacional (push) e e-mail. Só toast dentro do app.

## Estado atual (o que já existe e o que falta)

| Peça | Situação hoje | Arquivo de referência |
| --- | --- | --- |
| Leitura do `topic-meta` | pronta | `packages/course-parser/src/course_parser/parsers/curriculum.py` |
| Escrita do `status` | **pronta** (`set_topic_status`) | `packages/course-parser/src/course_parser/writers/topic_status.py` |
| Rota de status | **pronta** (`PATCH`, CORS liberado) | `apps/local-server/src/local_server/routes/courses.py` |
| Prompt e leitura da saída da CLI | **prontos** (`build_lesson_prompt`, `extract_result`) | `prompts.py`, `services/local_process.py` |
| Geração de aula | **pronta** (`POST .../lesson`, com job) | `routes/courses.py` |
| Geração de exercícios | **pronta** (`POST .../exercises`, com job) | `routes/courses.py` |
| Listagem de jobs | **pronta** (`GET /jobs`) | `routes/jobs.py`, `services/job_store.py` |
| Decisões pendentes | **não existem**; a saída da CLI fica em `Job.output`, fora da API | `services/job_store.py` |
| Tipos gerados | **desatualizados** (`openapi.json` + `schema.d.ts`) | `apps/client/package.json` (`generate:types`) |
| Frontend | somente leitura; já tem polling de job (`courseJobQuery`) e o cartão "não gerado". **Não há biblioteca de toast** instalada | `apps/client/src/app/api/queries.ts`, `ui/components/NotGeneratedCard.tsx`, `ui/components/AppLayout.tsx` |

Contrato que não muda: o formato do `topic-meta` e os valores de `status`
seguem iguais. Por isso **não** há alteração em `skill/references/*` por causa
do contrato. O comportamento de modo não interativo já está documentado em
`skill/SKILL.md`, seção "Interaction mode".

## Decisões de design (e por quê)

| Decisão | Escolha | Motivo |
| --- | --- | --- |
| Quem escreve no arquivo | **Só o servidor**, por uma função pura em `course-parser` que recebe o texto e devolve o texto novo | O SPEC diz que o vault é a fonte de verdade e que edições de estado são cirúrgicas. Uma função de texto é testável sem disco e sem FastAPI |
| Como trocar a linha | Regex restrita ao bloco ` ```topic-meta ` do tópico, trocando só `status:` | Regenerar o arquivo apagaria edições manuais do Obsidian (SPEC, seção 3). Parser reescrito seria mais frágil que um substituição localizada |
| Escape do id | `re.escape(topic_id)` antes de montar a regex | O id vem da URL. Sem escape, um id com caractere especial quebra ou casa o tópico errado (ex.: `1.1` casaria `1x1`) |
| Quebras de linha | Ler e escrever em bytes/`newline=''` e preservar `\r\n` | O usuário está no Windows e o Obsidian pode gravar CRLF. O parser normaliza `\r\n`, mas o escritor não pode normalizar o arquivo inteiro |
| Escrita | Escrever em arquivo temporário no mesmo diretório e trocar com `os.replace` | Evita arquivo meio escrito se o processo cair no meio da escrita. `os.replace` é atômico no mesmo volume |
| Validação de `in_progress` | Só aceitar se existir `lessons/<id>-*.md` para o tópico (já lido em `CourseBundle.lessons`) | Regra do SPEC: `in_progress` exige aula. Usar o bundle já carregado evita um segundo acesso ao disco |
| Código HTTP de `in_progress` sem aula | `409 Conflict` | É um conflito com o estado atual do vault, não um erro de formato. `422` ficaria reservado para status inválido, que o Pydantic já cobre |
| Status inválido | `Literal[...]` no corpo da requisição | O FastAPI responde 422 sozinho e o OpenAPI gera o enum; os tipos TS saem prontos |
| Campo `last_reviewed` | **Não** é alterado pela rota | O SPEC restringe a rota à linha `status`. Atualizar a data seria uma decisão separada (ver "Decisões em aberto") |
| Checkboxes dos subtópicos | **Não** são alterados pela rota | Mesmo motivo. Ver "Decisões em aberto", item 1, porque a skill faz isso ao concluir |
| Geração de aula e de exercícios | Rotas próprias com job, no mesmo modelo da criação de curso | Geração leva dezenas de segundos; sem job o request HTTP estoura o timeout do navegador e do subprocesso (300 s) |
| Resultado do job de geração | Verificar se o arquivo esperado existe após a execução (aula ou exercícios), **não** pela diferença de pastas | A diferença de pastas (`_existing_slugs`) serve para criar curso. Para uma aula ou um conjunto de exercícios, o artefato esperado é conhecido |
| Exercícios exigem aula | `409` se o tópico não tem aula | A skill lê a aula antes de gerar os exercícios (`SKILL.md`, Workflow 3). Sem aula, a execução falharia depois de gastar uso |
| Um job de geração ativo por curso, de **qualquer** tipo | A trava do `JobStore` ignora o tipo do job | A skill reescreve o mesmo `00-curriculum.md` e as pastas do mesmo curso; aula e exercícios simultâneos poderiam se atropelar |
| Jobs consultáveis em lista | `GET /jobs`, com filtros opcionais `slug` e `active`, do mais novo para o mais antigo (no máximo 50) | Alimenta três coisas com uma só rota: o painel da tela inicial, as notificações e o bloqueio dos botões por curso. Sem ela, ao recarregar a página o app não sabe qual job acompanhar. É um roteador novo (`/jobs`) porque `GET /courses/jobs` seria capturado por `GET /courses/{slug}`. O `GET /courses/jobs/{job_id}` existente não muda |
| Exercícios sem aula | Botão **visível, mas inativo**, com a explicação e o link para a aula; a rota continua recusando com `409` | O botão inativo evita a tentativa; o `409` protege contra chamadas diretas à API |
| Decisões pendentes | O servidor extrai as linhas `Pending status decision:` da saída da CLI e as devolve no job de **aula** | A decisão é do aluno. Expor as linhas pelo job evita que o app tenha de ler arquivos ou logs. Exercícios não geram decisões de status |
| Onde ficam os botões de gerar | Nos cartões "não gerado" das páginas de aula e de exercícios, e na página de aula quando a aula existe mas os exercícios não | É onde o aluno já cai ao abrir um tópico sem conteúdo. O card da trilha continua sendo um `Link`, sem controles dentro |
| Acompanhamento do job na UI | Um hook `useJobs` consulta `GET /jobs`; ao terminar um job, invalidar curso, aula e exercícios | Uma única forma de acompanhar tarefas. A invalidação faz os indicadores da trilha e as páginas aparecerem sem recarregar |
| Painel de jobs | Componente `JobsPanel` na tela inicial (lista de cursos), com **apenas os jobs em andamento** (`pending` ou `running`), de todos os tipos. **Sem histórico**: quando o job termina, ele some do painel. Esconde-se quando não há jobs | Mostra o que está rodando sem precisar abrir cada curso. O resultado (sucesso ou erro) chega pelo toast, então manter jobs terminados na tela só geraria ruído |
| Notificações | Toast (biblioteca `sonner`, via shadcn) quando um job **começa** e quando **termina** (sucesso ou erro). Uma única fonte: um observador global que compara o estado dos jobs entre consultas | Um observador no layout vê jobs iniciados em qualquer tela, inclusive em outra aba (ao voltar o foco). A primeira consulta só registra o estado, sem avisar, para não notificar jobs que já estavam rodando |
| Frequência da consulta | A cada 2 s enquanto houver job ativo; fora isso, só ao focar a janela e logo depois de iniciar uma geração | Não gasta requisições à toa com o servidor ocioso e ainda pega jobs iniciados em outro lugar |
| Diálogo de decisão | Um `Dialog` do shadcn, global no layout, aberto pelo observador quando um job de **aula** termina com decisões pendentes | Funciona mesmo se o aluno saiu da tela da aula. Cada opção chama a rota de status. Não há decisão automática: sem resposta, nada muda |
| Testes | `pytest` no `course-parser` para a função de escrita; testes de rota no `local-server` com `TestClient`, vault temporário e CLI simulada | A lógica de escrita é a parte que pode corromper dados, então merece teste automatizado. O client segue sem runner, como na Feature 4 |

## Estrutura de arquivos

```
packages/course-parser/
  src/course_parser/writers/topic_status.py   set_topic_status(...)              (feito)
  tests/test_topic_status.py                                                      (feito)

apps/local-server/src/local_server/
  routes/courses.py          PATCH status, POST lesson, POST exercises
  routes/jobs.py             GET /jobs (lista, filtros slug e active)               (novo)
  services/job_store.py      Job (kind, topic_id, output), trava por curso, list(), pending_decisions
  services/local_process.py  run + extract_result                                 (feito)
  prompts.py                 prompts de curso, aula e exercícios
  utils/atomic_write.py      leitura exata e escrita atômica                      (feito)
  app.py                     CORS com PATCH                                        (feito)
apps/local-server/tests/     conftest.py, test_status_route.py, test_lesson_job.py,
                             test_exercise_job.py, test_jobs_list.py, ...

apps/client/src/
  app/api/queries.ts         mutação de status; POST de aula e exercícios; lista de jobs
  app/api/schema.d.ts        regenerado
  openapi.json               regenerado (apps/client/openapi.json)
  app/hooks/useJobs.ts               lista de jobs com polling condicional        (novo)
  app/hooks/useJobsWatcher.ts        compara estados e dispara os toasts          (novo)
  ui/components/ui/Sonner.tsx        Toaster do shadcn, ligado ao tema do projeto  (novo)
  ui/components/AppLayout.tsx        monta o Toaster, o observador e o diálogo     (modifica)
  ui/components/JobsPanel.tsx        painel de jobs da tela inicial               (novo)
  ui/components/NotGeneratedCard.tsx botão de gerar e progresso                   (modifica)
  ui/components/GenerationProgress.tsx  spinner enquanto o job roda (sem erro)    (novo)
  ui/components/PendingStatusDialog.tsx                                           (novo)
  ui/pages/CoursesPage.tsx           monta o JobsPanel                            (modifica)
  ui/pages/LessonPage.tsx, ExercisesPage.tsx   botões e seletor de status         (modifica)
  app/i18n/locales/{en,pt-BR}.json   chaves de status, geração, painel e toasts   (modifica)

skill/SKILL.md               nenhuma mudança de texto esperada
```

`prompts.py` existe para tirar o texto dos prompts de dentro de
`routes/courses.py`. Ter os prompts com as regras de modo não interativo no
mesmo arquivo facilita manter todos iguais.

## Passos

Cada passo termina em um estado verificável e pode virar um commit. Ordem
importa: veja a coluna "Depende de".

| # | Passo | Depende de | Verificação |
| --- | --- | --- | --- |
| 1 ✅ | Função pura `set_topic_status` no `course-parser` + testes | — | `uv run pytest` |
| 2 ✅ | Rota `PATCH /courses/{slug}/topics/{topic_id}/status` | 1 | teste de rota; `uv run pytest` |
| 3 ✅ | Modo não interativo: prompt de aula e leitura da saída da CLI | — | teste do texto do prompt; execução manual de uma aula |
| 4 ✅ | Rota de geração de aula com job | 3 | teste do job com CLI simulada |
| 5 ✅ | Geração de exercícios com job; trava de um job por curso | 3, 4 | teste do job com CLI simulada |
| 6 ✅ | Listagem de jobs (`GET /jobs`) | 4, 5 | teste de rota |
| 7 | Extração de `Pending status decision:` e exposição no job de aula | 3, 4 | teste com saída de exemplo |
| 8 | Regerar tipos e verificar o contrato | 2, 4, 5, 6, 7 | `npm run generate:types` + `typecheck` |
| 9 | UI: mutação e seletor de status | 8 | `typecheck`, `lint`, `check:i18n`, navegador |
| 10 | UI: gerar aula e exercícios, com progresso do job | 8 | idem, com um job real em vault de teste |
| 11 | UI: painel de jobs na tela inicial e notificações (toast) | 8, 10 | idem, com jobs reais e simulados |
| 12 | UI: diálogo de decisão pendente | 7, 9, 11 | idem, com saída real da skill |
| 13 | Teste manual end-to-end e atualização do SPEC | todos | checklist abaixo |

### Passo 1 — Função pura de escrita no `course-parser`

**O que fazer:** criar `set_topic_status(text: str, topic_id: str, status: str) -> str`.

1. Validar `status` contra o mesmo `Literal` de `TopicMeta` (reutilizar o tipo,
   sem duplicar a lista de valores).
2. Localizar o heading `### <topic_id> ...`. Se não existir, levantar
   `TopicNotFoundError`.
3. Dentro do bloco ` ```topic-meta ` que segue esse heading, trocar a linha
   `status: ...` pelo novo valor. Se a linha não existir, levantar erro de
   formato, em vez de inserir uma linha no lugar errado.
4. Devolver o texto com todo o resto idêntico, byte a byte.

**Por quê:** é a única parte que altera dados do aluno. Mantê-la como função
de texto, sem I/O, permite testar os casos difíceis (CRLF, id `1.1` vs `1.10`,
bloco sem `status`) sem subir servidor. O `course-parser` já é o dono do
formato do vault, então a escrita fica perto da leitura.

**Testes (`packages/course-parser/tests/test_topic_status.py`):**

- troca só a linha `status` do tópico pedido (diff de uma linha);
- `1.1` não altera `1.10` nem `11.1`;
- preserva `\r\n` quando o arquivo usa CRLF;
- id inexistente levanta `TopicNotFoundError`;
- status fora dos quatro valores levanta `ValueError`;
- o resultado continua parseável por `parse_curriculum`, com o status novo.

Use o curso real de `tests/fixtures/` como entrada, além de um texto mínimo.

### Passo 2 — Rota PATCH de status

**O que fazer:**

1. Corpo da requisição: `{"status": Literal["pending", "in_progress", "completed", "review"]}`.
2. Carregar o curso com `_load_course_or_404`.
3. Se `status == "in_progress"`, conferir se há aula para o tópico em
   `course.lessons`. Se não houver, responder `409` com mensagem explicando que
   a aula precisa existir.
4. Ler o `00-curriculum.md`, chamar `set_topic_status`, gravar com
   escrita atômica (arquivo temporário + `os.replace`).
5. Responder o `TopicMeta` atualizado, ou o curso inteiro? **Decisão:** devolver
   o `Topic` atualizado. O app já invalida o curso inteiro; devolver só o tópico
   evita recarregar o vault à toa e deixa o contrato pequeno.
6. Adicionar `"PATCH"` em `allow_methods` da CORS (`app.py`). Sem isso, o
   navegador bloqueia a chamada do app mesmo com a rota pronta.

**Por quê cada detalhe:**

- O passo 3 existe porque o SPEC proíbe `in_progress` sem aula. Sem a checagem,
  o aluno poderia colocar um tópico em estado que a skill não espera.
- `409` e não `422`: o corpo é válido, mas o estado do vault impede a ação.
- A checagem de CORS é fácil de esquecer e só aparece no navegador, não no
  `TestClient`. Por isso está no passo, não só nos testes.

**Erros:** slug inválido ou curso inexistente → `404` (já coberto por
`_course_dir_or_404`); tópico inexistente → `404`; status inválido → `422`
automático.

**Testes (`apps/local-server/tests/test_status_route.py`):** `TestClient` com um
vault temporário (`VAULT_PATH` apontando para `tmp_path`) criado a partir de
uma fixture. Casos: `completed` com aula, `in_progress` sem aula (409),
`in_progress` com aula (200), tópico inexistente (404), status inválido (422),
e uma checagem de que o arquivo mudou só na linha `status`.

### Passo 3 — Modo não interativo na geração de aula

**O que fazer:**

1. Mover os prompts para `prompts.py`, sem mudar o texto do prompt de criação.
2. Criar `build_lesson_prompt(slug, topic_id, user_context: str | None) -> str`
   que declara explicitamente: não há usuário presente; não faça perguntas;
   use os defaults; **não** altere status de tópicos `in_progress` (regra do
   `SKILL.md`, "Interaction mode"); termine a saída com uma linha
   `Pending status decision: <id> <título>` por tópico pendente.
3. Fazer `LocalProcess.create_course_subprocess` devolver a saída (já devolve
   `result.stdout`). Hoje `_run_course_creation` descarta esse valor; passar a
   guardá-lo no job.
4. Confirmar que o `--output-format json` do Claude Code devolve o texto final
   num campo `result`. **Verificar com uma execução real** antes de depender
   disso. Se o formato for outro, o parser do Passo 7 muda.

**Por quê:** o SPEC diz que a skill, sem ninguém do outro lado, não pode
perguntar. Sem a declaração explícita no prompt, a skill assume que há usuário
e pergunta, o que trava a execução headless até o timeout de 300 s. O
`SKILL.md` já prevê a declaração; falta o servidor fazê-la.

**Verificação:** teste de que o prompt contém as frases de modo não
interativo; uma execução manual de `build_lesson_prompt` contra um curso de
teste, conferindo que a saída não contém pergunta.

**Resultado (entregue em 2026-10-25):**

- `prompts.py` tem `build_course_prompt` (texto idêntico ao anterior, conferido
  contra o `HEAD`) e `build_lesson_prompt(slug, topic_id)`. O parâmetro
  `user_context` do plano não foi criado: nada o usa ainda. A função recusa
  `slug` e `topic_id` com formato inesperado, porque os dois entram no texto do
  prompt.
- `LocalProcess.create_course_subprocess` virou `run` (devolve o stdout cru) e
  nasceu `extract_result(stdout)`, que lê o texto final do JSON da CLI e
  levanta `RuntimeError` para JSON inválido, ausência de `result` ou
  `is_error`.
- **Formato confirmado com a CLI real:** `claude -p --output-format json`
  imprime um único objeto JSON com `type: "result"`, `is_error` e o texto final
  em `result`. O Passo 7 pode contar com isso.
- **Armazenar a saída no job ficou para o Passo 4**, junto com os campos novos
  do job (`kind`, `pending_decisions`). Guardar agora criaria campos sem uso.
- **Execução real em cópia temporária** (fixture `java-para-quem-programa`, com
  o tópico 1.1 em `in_progress`, pedindo a aula do 1.2): a skill não fez
  perguntas, gerou a aula, deixou o 1.1 em `in_progress` e terminou a saída com
  `Pending status decision: 1.1 JVM, JDK e o modelo de execução`. O formato da
  linha bate com o que o Passo 7 vai extrair.
- **Efeito colateral observado:** a CLI gravou `.claude/model-roles.json` na
  pasta de trabalho (`cwd`), por causa de um hook de início de sessão do
  ambiente do usuário. No servidor, `cwd` é o `VAULT_PATH`, então esse arquivo
  pode aparecer dentro do vault. É anterior a esta feature (a criação de curso
  já roda do mesmo jeito) e não foi corrigido aqui.

### Passo 4 — Rota de geração de aula com job

**O que fazer:**

1. `POST /courses/{slug}/topics/{topic_id}/lesson` → cria um job e responde
   `202` com o job. Pré-checagens (sincronas): curso existe, tópico existe,
   aula ainda não existe (senão `409`; regerar aula existente é outro
   escopo).
2. `JobStore` ganha o campo `kind` (`course_creation | lesson_generation`) e
   `pending_decisions: list[str]`. Renomear `CourseCreationJob` para `Job` é
   um ajuste pequeno e evita um tipo com nome errado; o OpenAPI muda (ver
   Passo 8).
3. A tarefa de background roda `claude -p` com o prompt do Passo 3, em
   `cwd=VAULT_PATH`, com o mesmo timeout de 300 s.
4. Ao terminar: confirmar que `lessons/<topic_id>-*.md` existe. Se existir, o
   job vira `done`; se não, `error` com a saída da CLI resumida.
5. Extrair as linhas `Pending status decision:` (Passo 7) e guardá-las no job.

**Por quê:**

- Job e não request síncrona: a geração pode levar mais que o timeout do
  navegador. O polling já existe no client para a criação de curso; reutilizar
  o mesmo padrão evita uma segunda forma de acompanhar tarefas.
- Verificar pelo arquivo, não pela diferença de pastas: a diferença de pastas
  é a forma atual de descobrir o slug de um curso novo; para uma aula, o
  resultado esperado é conhecido e o arquivo é a prova real.
- `JobStore` continua em memória (pendência já listada no SPEC). Com a Feature 6,
  um job de aula perdido ao reiniciar o servidor é aceitável; a aula pode ser
  gerada de novo. Não é motivo para persistir jobs agora.

**Risco conhecido:** dois jobs de aula no mesmo curso ao mesmo tempo podem
escrever no `00-curriculum.md` ao mesmo tempo. Mitigação mínima nesta feature:
recusar um segundo job para o mesmo `slug` enquanto houver um em `pending` ou
`running` (`409`). Um lock de escrita fica para depois.

**Resultado (entregue em 2026-10-25):**

- `POST /courses/{slug}/topics/{topic_id}/lesson` (`operation_id`
  `generate_lesson`) responde `202` com o job. Antes de criar o job, recusa:
  curso ou tópico inexistente (`404`), tópico que já tem aula (`409`), job de
  aula ativo no mesmo curso (`409`) e slug que não passa na validação do prompt
  (`422`).
- `CourseCreationJob` virou `Job`, com `kind` (`course_creation` |
  `lesson_generation`) e `topic_id`. O `operation_id` de consulta passou a
  `get_job`; o caminho `GET /courses/jobs/{job_id}` não mudou, então o
  frontend não precisa mudar por isso.
- O texto final da CLI fica em `Job.output`, **fora da API** (`exclude=True`;
  não aparece nem no OpenAPI). É o armazenamento que o Passo 7 vai usar para
  extrair as decisões pendentes. O campo público `pending_decisions` só nasce
  no Passo 7.
- A trava "um job de aula por curso" é feita dentro do `JobStore`
  (`create_exclusive`, com `threading.Lock`), para duas requisições simultâneas
  não passarem juntas pela checagem. Hoje a trava compara também o tipo do job;
  o Passo 5 a generaliza.
- O job só vira `done` se o curso recarregado tiver a aula do tópico. Se a CLI
  terminar sem gerá-la, o job vira `error` com o início da resposta do agente.
- Testes com a CLI simulada, em `tests/test_lesson_job.py`, incluindo uma
  regressão da criação de curso (que não tinha teste). Fixtures comuns foram
  para `tests/conftest.py`, que também dá um `JobStore` novo a cada teste.
- **Contrato mudou, tipos não:** `openapi.json` e `schema.d.ts` seguem como
  antes até o Passo 8.

### Passo 5 — Geração de exercícios com job

**O que fazer:**

1. Em `prompts.py`, criar `build_exercises_prompt(slug, topic_id)` com a mesma
   validação de entrada de `build_lesson_prompt`. O texto declara o modo não
   interativo, pede só os **exercícios** do tópico (Workflow 3 da skill), manda
   não alterar nenhum status e **não** pede linhas `Pending status decision`:
   gerar exercícios não abre decisão de status.
2. Em `job_store.py`, novo `JobKind.EXERCISE_GENERATION`. Mudar
   `create_exclusive` para **ignorar o tipo**: um job ativo por curso, seja de
   aula ou de exercícios.
3. `POST /courses/{slug}/topics/{topic_id}/exercises` (`operation_id`
   `generate_exercises`), `202` com o job. Recusas, nesta ordem: curso ou tópico
   inexistente (`404`); tópico **sem aula** (`409`, "gere a aula primeiro");
   tópico que já tem exercícios (`409`); slug fora do formato (`422`); job ativo
   no curso (`409`).
4. Generalizar a tarefa de segundo plano: `_run_lesson_generation` vira
   `_run_generation(job_id, slug, topic_id, prompt, produced)`, onde `produced`
   recebe o curso recarregado e diz se o artefato esperado existe (aula ou
   conjunto de exercícios). Aula e exercícios passam pelo mesmo código, sem
   duplicar o tratamento de erros.
5. O job só vira `done` se `produced` for verdadeiro; senão `error` com o início
   da resposta do agente, como na aula.
6. **Nenhum job fica `running` para sempre.** Hoje a tarefa só captura
   `InvalidPromptException` e `RuntimeError`; um `FileNotFoundError` (por
   exemplo, o `claude` fora do `PATH`) escapa, a tarefa morre e o job permanece
   `running`. A tarefa passa a capturar qualquer exceção, marcar o job como
   `error` com a mensagem e registrar o erro no log do servidor. O mesmo vale
   para a tarefa de criação de curso.

**Por quê:**

- A skill lê a aula antes de gerar os exercícios. Sem a checagem de `409`, o
  aluno gastaria uso e esperaria minutos para a execução falhar no fim.
- A trava por curso ignora o tipo porque aula e exercícios mexem nas mesmas
  pastas e no mesmo currículo. Duas execuções ao mesmo tempo no mesmo curso é o
  risco que o Passo 4 já tinha apontado; só estava limitado a aulas.
- Generalizar a tarefa evita ter duas cópias do mesmo fluxo (rodar, ler, conferir
  o arquivo, marcar o job), que divergiriam com o tempo.

**Testes (`tests/test_exercise_job.py`):** CLI simulada que escreve o arquivo de
exercícios. Casos: sucesso (`done` e exercícios visíveis no curso); a CLI termina
sem gerar o arquivo (`error`); falha da CLI; `404` de curso e de tópico; `409`
sem aula; `409` com exercícios já existentes; `409` com **job de aula** ativo no
mesmo curso (e o inverso); `422` para slug inseguro; o prompt recebido contém o
slug, o tópico e as regras de modo não interativo; uma exceção inesperada na CLI
(como `FileNotFoundError`) deixa o job em `error`, e o mesmo para a criação de
curso. Os testes de aula continuam passando sem alteração.

**Resultado (entregue em 2026-10-25):**

- `POST /courses/{slug}/topics/{topic_id}/exercises` (`operation_id`
  `generate_exercises`) responde `202` com o job. Recusa, nesta ordem: curso ou
  tópico inexistente (`404`), tópico sem aula (`409`), tópico que já tem
  exercícios (`409`), slug fora do formato do prompt (`422`) e job de geração
  ativo no curso (`409`).
- `build_exercises_prompt` declara o modo não interativo, pede só os exercícios,
  manda não alterar nenhum status e **não** pede linhas `Pending status
  decision`. A validação de `slug` e `topic_id` virou uma função compartilhada
  com o prompt de aula.
- A tarefa de segundo plano ficou única: `_run_generation(...)`, com
  `produced(course)` para conferir o arquivo gerado (aula ou exercícios). A rota
  de aula passou a usá-la, sem mudar seu comportamento.
- `create_exclusive` ignora o tipo do job: um job ativo por curso, de qualquer
  tipo. Há `JobKind.EXERCISE_GENERATION`.
- **Nenhum job fica `running` para sempre:** qualquer exceção da tarefa
  (como `FileNotFoundError` com o `claude` fora do `PATH`) marca o job como
  `error` e registra o erro no log. O mesmo vale para a criação de curso.
- O simulador de CLI foi para o `conftest.py` (fixture `fake_cli`) e ganhou o
  modo `exercises`. Novos testes em `tests/test_exercise_job.py`; os de aula
  ganharam a trava entre tipos e o caso de exceção inesperada.
- **Execução real** (cópia temporária da fixture, sem os exercícios do tópico
  1.1, pela própria rota): o job terminou `done` em cerca de **43 s**; a skill não
  fez perguntas, escreveu o arquivo de exercícios (parseável, `GET` devolveu
  `200`), não alterou nenhum status nem o `00-curriculum.md`, e usou o resultado
  da tentativa anterior para calibrar a dificuldade.

### Passo 6 — Listagem de jobs

**O que fazer:**

1. `JobStore.list_jobs(slug=None, active=None, limit=50)`, que devolve os jobs do
   mais novo para o mais antigo. O filtro `slug` limita ao curso; `active=true`
   limita aos jobs `pending` ou `running`; `active=false`, aos terminados. A ordem
   vem da ordem de inserção do dicionário (o `id` é aleatório e não serve), então
   não é preciso um campo novo no job.
2. Novo roteador `routes/jobs.py` com `GET /jobs` (`operation_id` `list_jobs`),
   que aceita `slug` e `active` como parâmetros de consulta e devolve no máximo
   os 50 jobs mais novos. Registrar o roteador em `app.py`.
3. `GET /courses/jobs/{job_id}` (`get_job`) continua como está.

**Por quê:** uma rota só atende as três necessidades do frontend:

- o painel da tela inicial precisa dos jobs **em andamento** de todos os cursos
  (o app filtra os que estão `pending` ou `running`; o painel não guarda
  histórico);
- o observador de notificações precisa ver jobs novos e jobs que mudaram de
  estado, inclusive iniciados em outra aba ou chamando a API direto. Por isso a
  rota também devolve os jobs terminados: sem eles o observador não saberia se um
  job que sumiu da lista acabou bem ou mal;
- com um job por curso, os botões de gerar e o seletor de status de um curso
  precisam saber se há job ativo nele (`?slug=...&active=true`).

O caminho é `/jobs` e não `/courses/jobs` porque o `GET /courses/{slug}` já
declarado capturaria `/courses/jobs` como se `jobs` fosse um curso.

**Limite aceito:** os jobs vivem na memória do servidor. Reiniciar o servidor
apaga a lista. O resultado de um job chega ao aluno só pelo toast no momento em
que o job termina; se o aluno estava com o app fechado, ele não vê o resultado
(só vê a aula ou os exercícios passarem a existir, ou não).

**Testes (`tests/test_jobs_list.py`):** lista vazia; ordem do mais novo para o
mais antigo; filtro `slug`; filtro `active` (exclui `done` e `error`); o limite de
50; o campo `output` continua fora da resposta.

**Resultado (entregue em 2026-10-25):**

- `GET /jobs` (`operation_id` `list_jobs`), em `routes/jobs.py`, registrado em
  `app.py`. Aceita `slug` e `active` como parâmetros de consulta opcionais e
  devolve `list[Job]`. Um `slug` desconhecido devolve lista vazia (é só um
  filtro de texto); um `active` que não seja booleano devolve `422`.
- O método do `JobStore` se chama `list_jobs`, e não `list`: um método chamado
  `list` dentro da classe esconderia o tipo `list[Job]` usado nas anotações dos
  métodos seguintes.
- O limite de 50 é fixo e vale **depois** dos filtros. Os jobs terminados fazem
  parte da resposta sem filtro, para o observador de toasts saber o desfecho.
- O `conftest.py` agora troca o `JobStore` de `courses.py` **e** o de `jobs.py`
  pela mesma instância nova de cada teste (a fixture devolve essa instância,
  para os testes criarem jobs direto).
- Conferido também no servidor de desenvolvimento em execução: `GET /jobs`
  devolve `[]`, e `?active=maybe` devolve `422`.
- **Contrato mudou, tipos não:** `openapi.json` e `schema.d.ts` seguem como antes
  até o Passo 8.

### Passo 7 — Decisões pendentes

**O que fazer:**

1. Função `parse_pending_decisions(output: str) -> list[PendingDecision]` que
   busca linhas no formato `Pending status decision: <id> <título>`.
2. Chamar essa função ao concluir um job de **aula** e gravar o resultado em
   `pending_decisions`. Jobs de exercícios e de criação de curso não têm essa
   lista.
3. Expor `pending_decisions` em `GET /courses/jobs/{job_id}` e em `GET /jobs`.

**Por quê:** o SPEC diz que a decisão é do aluno e não do LLM. O servidor só
transporta a informação; quem decide é a UI. Fazer o parse no servidor, e não
no app, mantém o app livre de conhecer o formato de saída da skill.

**Teste:** saída de exemplo com duas linhas válidas, uma linha parecida mas
inválida (`Pending status decision` sem id) e texto comum; só as válidas devem
ser extraídas.

### Passo 8 — Regerar tipos e conferir o contrato

**O que fazer:** `cd apps/client && npm run generate:types`, depois revisar o
diff de `openapi.json` e `schema.d.ts` e commitar os dois.

**Por quê:** o CLAUDE.md do projeto exige isso ao mudar rotas ou models. O
frontend importa tipos só de `@app/api/client`, então o passo é obrigatório
para os Passos 9 a 11 compilarem. Ele vem depois de todas as mudanças de
contrato do servidor (Passos 5, 6 e 7) para gerar os tipos uma vez só.

**Verificação:** `npm run typecheck`. Um tipo novo sem uso no client já prova
que o OpenAPI saiu certo.

### Passo 9 — UI: mutação e seletor de status

**O que fazer:**

1. Em `app/api/queries.ts`, criar `useUpdateTopicStatus(slug)`: mutação com a
   rota do Passo 2 via `openapi-fetch`, e, ao concluir, invalidar a query do
   curso para a trilha e os badges refletirem o status novo.
2. Mostrar um seletor de status na página de aula (`LessonPage`). Motivo de ser
   nela e não na trilha: o card é um `Link` (Feature 5); um controle dentro de
   um link é HTML inválido, o mesmo problema já corrigido em `TopicCard`.
   O seletor fica desabilitado enquanto houver job ativo no curso (Passo 6), para
   não competir com a escrita da skill no currículo.
3. Tratar `409` com uma mensagem clara ("gere a aula antes de marcar em
   andamento") e não com erro genérico.
4. Textos em `en.json` e `pt-BR.json`, e `npm run check:i18n`.

**Por quê:** a rota sozinha não entrega valor; o aluno precisa do controle.
Colocar o seletor na aula, e não no card, segue a regra do SPEC de que o
`Link` do card não recebe controles. Desabilitar durante um job reduz o risco,
já registrado, de uma edição de status se perder enquanto a skill escreve.

### Passo 10 — UI: gerar aula e exercícios

**O que fazer:**

1. Em `app/api/queries.ts`: funções `generateLesson(slug, topicId)` e
   `generateExercises(slug, topicId)` (POST, devolvem o `Job`) e a consulta
   `jobsQuery({ slug, active })` (rota `GET /jobs` do Passo 6).
2. Novo hook `useJobs(filtro)`, que consulta `GET /jobs` e repete a consulta a
   cada 2 s **enquanto houver job ativo**; sem job ativo, só consulta ao focar a
   janela. Ao terminar um job com sucesso, invalida as queries do curso, da aula
   e dos exercícios. Depois de um `POST` de geração, invalida a lista de jobs
   para o job novo aparecer na hora.
3. Novo componente `GenerationProgress`: spinner e texto "Gerando… pode levar
   alguns minutos" enquanto o job roda. Ele **não guarda resultado**: quando o
   job termina, o componente some. Se falhou, o erro chega pelo toast do
   Passo 11 e a página volta ao estado "não gerado", com o botão de gerar ativo
   de novo (repetir é clicar outra vez).
4. `NotGeneratedCard` ganha o botão de gerar e mostra o `GenerationProgress`
   enquanto há job. Na `LessonPage` o botão gera a **aula**; na `ExercisesPage`
   gera os **exercícios**. Se o tópico não tem aula, a `ExercisesPage` mostra o
   botão **inativo**, com a explicação de que os exercícios dependem da aula e um
   link para a página de aula. A rota continua recusando com `409` caso alguém
   chame a API direto.
5. Na `LessonPage`, quando a aula existe mas os exercícios não, mostrar o botão
   "Gerar exercícios" junto do link para a página de exercícios.
6. Com um job ativo no curso (`useJobs({ slug, active: true })`), **todos** os
   botões de gerar ficam inativos e a tela mostra o progresso desse job. Um `409`
   ao iniciar (outro job começou antes) refaz a consulta de jobs em vez de
   mostrar um erro seco.
7. Textos em `en.json` e `pt-BR.json`, e `npm run check:i18n`.

**Por quê:**

- Os botões ficam onde o aluno já cai ao abrir um tópico sem conteúdo. Pôr
  controles no card da trilha reabriria o problema do botão dentro do `Link`.
- Consultar a lista de jobs, em vez de guardar o id do job só em estado do
  componente, faz o progresso sobreviver a recarregar a página e a navegar
  entre telas.
- Invalidar também a query do curso faz os ícones de aula e de exercícios da
  trilha aparecerem sem recarregar.
- Botão inativo na UI e `409` na rota são duas defesas diferentes: uma evita a
  tentativa, a outra protege contra chamadas diretas.

**Verificação:** `typecheck`, `lint`, `check:i18n`, e navegador com um job
real em um vault de teste (a CLI consome uso e leva minutos; ver Passo 13).
O client não tem runner de testes, como na Feature 4.

### Passo 11 — UI: painel de jobs na tela inicial e notificações

**O que fazer:**

1. **Toast.** Antes de qualquer `add`, rodar `npx shadcn@latest info --cwd
   apps/client` (regra do CLAUDE.md) e então adicionar o componente `sonner`
   com `--cwd apps/client`. Isso instala uma dependência nova (`sonner`). O
   componente do shadcn assume `next-themes`; ajustá-lo para o seletor de tema
   do projeto (claro, escuro, sistema), e salvá-lo como `Sonner.tsx`, respeitando
   a capitalização dos outros arquivos de `ui/components/ui/`. Montar o
   `<Toaster />` em `AppLayout`.
2. **Painel.** Novo componente `JobsPanel`, montado em `CoursesPage` (a tela
   inicial), usando `useJobs()`. Ele mostra **somente os jobs em andamento**
   (`pending` ou `running`). Cada linha traz o tipo e o alvo ("Aula 1.2 — Java
   para quem já programa", "Exercícios 1.2", "Criação de curso"), o tempo
   decorrido e um link para o curso. **Não há histórico:** assim que o job
   termina, a linha some; sucesso ou erro são avisados só pelo toast. O painel
   se esconde quando não há jobs. Os nomes de curso e de tópico vêm dos cursos
   que a página já carrega.
3. **Observador de notificações.** Novo hook `useJobsWatcher`, montado em
   `AppLayout` (vale para qualquer tela). Guarda o estado anterior de cada job
   pelo `id` e compara a cada consulta:
   - job novo em `pending` ou `running` → toast **"Geração iniciada"**;
   - job que passou a `done` → toast de sucesso, com ação "Abrir" (aula,
     exercícios ou curso);
   - job que passou a `error` → toast de erro com a mensagem do job.
   A **primeira** consulta só registra o estado, sem avisar, para não
   notificar jobs que já estavam rodando ao abrir o app.
4. **Todos os tipos de job** entram no painel e nos toasts, inclusive a criação
   de curso. O diálogo de criação de curso mantém o acompanhamento que já tem; o
   toast de fim de job vale para quem saiu dessa tela.
5. Textos em `en.json` e `pt-BR.json`, e `npm run check:i18n`.

**Por quê:**

- Um observador no layout, e não em cada página, é a única forma de avisar do
  fim de um job quando o aluno já está em outra tela.
- Uma só fonte de eventos (a comparação de estados do observador) evita avisos
  duplicados, por exemplo um toast de início vindo do botão e outro vindo do
  observador.
- Começar sem avisar na primeira consulta evita uma enxurrada de toasts ao
  abrir o app com jobs já em andamento.
- `sonner` é o componente de toast que o shadcn já oferece; segue o padrão do
  projeto em vez de uma implementação própria.

**Verificação:** `typecheck`, `lint`, `check:i18n` e navegador. O ciclo
completo (início, progresso, fim) precisa de um job real em um vault de teste.
Para ver o toast de **erro** sem gastar uso da CLI, iniciar o servidor com um
`PATH` em que o `claude` não exista: a geração falha na hora e o job vira `error`
(isso depende do tratamento de exceções do Passo 5).

### Passo 12 — UI: diálogo de decisão pendente

**O que fazer:**

1. Criar `PendingStatusDialog`, um `Dialog` do shadcn com uma pergunta por
   decisão e três opções: "Concluí" (`completed`), "Quero revisar" (`review`),
   "Ainda estou estudando" (`in_progress`, sem chamada se já estiver assim).
2. Montar o diálogo em `AppLayout` e abri-lo pelo observador do Passo 11 quando
   um job de **aula** passar a `done` com `pending_decisions`. As decisões vêm do
   job que acabou de terminar; se o aluno fechar o app, a decisão volta a ser
   pedida na próxima geração. Ver "Decisões em aberto", item 2.
3. Cada opção chama a rota do Passo 2 e, depois, fecha a decisão na lista.
4. Sem resposta, nada muda. O diálogo não tem "fechar = concluir".

**Por quê:** a decisão de concluir é do aluno. Um diálogo que assumisse
"concluir" por padrão quebraria essa regra. Usar `Dialog` (Radix) já cuida de
foco e ESC, como na Feature 4. Montá-lo no layout, e não na página da aula, faz
a pergunta aparecer mesmo se o aluno saiu da tela enquanto a aula era gerada.

**Verificação:** `typecheck`, `lint`, `check:i18n`, e navegador com uma
saída real da skill.

### Passo 13 — Teste end-to-end e fechamento

Checklist manual, com um vault de teste (não o vault real):

- [ ] Marcar `pending → completed` pela aula; o arquivo mudou só na linha `status`.
- [ ] Marcar `in_progress` em tópico sem aula: 409 e mensagem clara.
- [ ] Gerar a aula pelo app: o progresso aparece, o job vai de `pending` a `running` a `done`, a aula aparece e o ícone do card na trilha muda sem recarregar.
- [ ] Gerar os exercícios pelo app, em um tópico com aula: mesmo comportamento, com a página de exercícios mostrando o conteúdo.
- [ ] Na página de exercícios de um tópico sem aula: botão inativo, com o aviso de que falta a aula e o link para a aula. Chamar a rota direto na API devolve `409`.
- [ ] Durante uma geração, todos os botões de gerar e o seletor de status do curso ficam inativos; um segundo `POST` direto na API devolve `409`.
- [ ] Recarregar a página durante uma geração: o progresso reaparece (lista de jobs).
- [ ] O painel da tela inicial lista o job em andamento e **some** quando o job termina (sucesso ou erro), sem deixar histórico; o resultado aparece só no toast.
- [ ] Toast de início ao disparar uma geração e toast de fim (sucesso) ao terminar, inclusive com o aluno em outra tela. Abrir o app com um job já rodando **não** dispara toast de início.
- [ ] Toast de erro quando a geração falha (ex.: servidor iniciado sem o `claude` no `PATH`), com a mensagem do job.
- [ ] Anotar o tempo real de uma aula e de um conjunto de exercícios, para decidir se os 300 s de timeout bastam.
- [ ] A saída da skill traz `Pending status decision`; o diálogo abre; cada opção muda o status.
- [ ] Editar o `00-curriculum.md` no editor com CRLF; a rota preserva CRLF.
- [ ] Reiniciar o servidor no meio de um job: o job some e a geração pode ser repetida, sem corromper o currículo.
- [ ] Atualizar o SPEC: marcar os itens da Feature 6 (incluindo a geração de exercícios e a geração pelo frontend), mover o `PATCH` de "Stretch" para "Concluído" (ou remover a duplicata), e registrar as decisões tomadas.

Rodar antes de encerrar, como manda o CLAUDE.md:

```sh
# frontend (em apps/client)
npm run typecheck && npm run lint && npm run check:i18n

# Python (na raiz)
uv run pytest
uv run ruff check packages/course-parser apps/local-server && uv run ruff format --check packages/course-parser apps/local-server
```

## Decisões em aberto

Todas as decisões abaixo foram tomadas pelo Samuel em 2026-10-25. Nenhuma está
pendente; a seção fica como registro do que foi decidido e por quê.

1. **A rota de status deve também marcar os checkboxes dos subtópicos quando o
   status vira `completed`?** A skill faz isso ao concluir (SKILL.md,
   "Finished"), mas o SPEC restringe a rota à linha `status`.
   *Aceito:* não. Manter a rota pequena. Se o aluno marca `completed` no
   app, os checkboxes ficam para trás até ele editar à mão ou a skill rodar de
   novo. Isso deixa o estado do currículo inconsistente por um tempo; aceito
   nesta feature, e a inconsistência fica registrada no SPEC.
   *Alternativa:* atualizar também os checkboxes. Mais coerente, mas a rota
   passa a editar mais de uma linha, e o risco de erro cresce.

2. **O que acontece com as decisões pendentes se o aluno fechar o app?**
   *Aceito:* não persistir. As decisões voltam a aparecer na próxima
   geração de aula. Persistir exigiria saber quando a decisão expirou, e o
   vault já guarda o status real.

3. **`last_reviewed` deve ser atualizado pela rota?** O SPEC diz que `last_reviewed`
   é definido ao gerar ou revisar a aula. *Aceito:* não atualizar nesta
   rota; o campo passa a ser atualizado só pela skill, como hoje.

4. **O app deve mostrar o botão "Gerar aula" em tópicos sem aula?**
   *Aceito:* sim, na página de aula, com o estado "aula não gerada" já
   existente (404). O mesmo vale agora para "Gerar exercícios" (Passo 10).

5. **Um job de geração ativo por curso, de qualquer tipo, ou só um por tipo?**
   *Decidido:* um por curso, de qualquer tipo, "para não correr o risco da
   escrita simultânea". *Custo aceito:* o aluno não gera exercícios de um tópico
   enquanto a aula de outro está sendo gerada no mesmo curso.

6. **Como o app acompanha os jobs, inclusive depois de recarregar?**
   *Decidido:* um componente na tela inicial que exibe o job em andamento
   (`JobsPanel`, **sem histórico**: o job some do painel ao terminar) e
   notificações em toast quando um job começa e quando termina (Passo 11). Isso
   trocou a proposta original (uma rota de job ativo por curso) por uma listagem
   de jobs (`GET /jobs`, Passo 6), que serve ao painel, aos toasts e ao bloqueio
   dos botões. *Escolhas do plano dentro dessa decisão, ajustáveis:* o painel e
   os toasts cobrem todos os tipos de job, inclusive a criação de curso; a
   consulta repete a cada 2 s só enquanto há job ativo; a primeira consulta não
   gera toast.

7. **A página de exercícios de um tópico sem aula deve ter botão de gerar?**
   *Decidido:* o botão fica **inativo**, com a explicação e o link para a aula, e
   a rota devolve erro (`409`) "por precaução em caso de chamadas diretas na
   API".

## Riscos

- **Formato de saída da CLI.** Já confirmado no Passo 3: um objeto JSON com
  `result`. Se uma versão futura da CLI mudar isso, o `extract_result` e o
  parser do Passo 7 mudam.
- **Corrida entre Obsidian e o servidor.** A escrita atômica evita arquivo
  corrompido, mas não impede que o Obsidian sobrescreva a mudança se gravar
  depois. Aceito; é o risco já registrado em "Decisões adiadas".
- **Skill ignorar o modo não interativo.** Se a skill perguntar mesmo com a
  declaração, o job trava até o timeout. Mitigação: o Passo 3 testou a aula com
  uma execução real, e o Passo 5 fez o mesmo com os exercícios.
- **Timeout de 300 s.** Os exercícios levaram cerca de 43 s em uma execução real
  (Passo 5); a aula ainda não foi cronometrada. Se estourar, o job vira `error` e
  o arquivo pode ficar incompleto. Medir a aula no Passo 13.
- **Job preso em `running`.** Uma exceção que não seja `RuntimeError` (por
  exemplo, o `claude` fora do `PATH`) mata a tarefa e deixa o job `running` para
  sempre, o que travaria o curso (trava por curso) e confundiria o painel.
  Mitigação no Passo 5: qualquer exceção marca o job como `error`.
- **Excesso de notificações.** Com jobs de todos os tipos e vários cursos, os
  toasts podem se acumular. Mitigação: a primeira consulta não avisa, e há uma
  trava de um job por curso. Se ainda incomodar, restringir os toasts de início
  aos jobs iniciados pela própria aba.
- **Nova dependência no frontend.** O toast traz o `sonner`. Adicionar pelo
  `shadcn` (com `--cwd apps/client`) e conferir o ajuste ao tema do projeto.
- **Edição de status durante a escrita da skill.** O lock do `PATCH` não alcança
  o processo da CLI. A UI mitiga desabilitando o seletor durante um job
  (Passo 9); quem edita o Obsidian à mão continua sujeito ao risco.
- **Dois jobs no mesmo curso.** Mitigado pela trava por curso no `JobStore`
  (Passos 4 e 5). Não há lock de arquivo.
- **Efeito colateral da CLI no vault.** A CLI pode gravar
  `.claude/model-roles.json` dentro do `VAULT_PATH`, por causa de um hook do
  ambiente do usuário (Passo 3). Anterior a esta feature; não corrigido.
