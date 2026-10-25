# Plan: Feature 6 — Progresso do aluno pelo app

> **Status: planejado (não iniciado).** Especificação de origem:
> [`docs/SPEC.md`](../../SPEC.md), seção 9, "Feature 6 — Progresso do aluno pelo app".

## Contexto

Hoje o `status` de um tópico (`pending | in_progress | completed | review`) só
muda à mão no Obsidian ou pela skill. O app é somente leitura: mostra o status
na trilha, mas não consegue alterá-lo. A Feature 6 fecha esse ciclo em quatro
partes:

1. uma rota para alterar o status sem regenerar o arquivo;
2. a geração de aula pelo app, em modo não interativo;
3. a leitura, pelo app, das decisões pendentes que a skill devolve;
4. um diálogo que pergunta ao aluno o que fazer com cada decisão.

**Entrega:** o aluno muda o status de um tópico pelo app ou pelo Obsidian, e o
app reflete a mudança sem regenerar nenhum arquivo.

**Fora do escopo:**

- Write-back com edição concorrente do Obsidian (continua em "Decisões
  adiadas" do SPEC). A rota desta feature escreve só a linha `status`, o que
  reduz a janela de conflito, mas não a elimina.
- Atualização em tempo real (SSE/`watchfiles`). Após uma mudança, o app
  invalida a query do curso; não há push.
- Pré-requisitos (`requires_all` / `requires_any`) e `optional: true`. São
  itens do Todoist, não desta feature.
- Correção de exercícios pela UI. Continua sendo papel da skill.

## Estado atual (o que já existe e o que falta)

| Peça | Situação hoje | Arquivo de referência |
| --- | --- | --- |
| Leitura do `topic-meta` | pronta; o parser só lê | `packages/course-parser/src/course_parser/parsers/curriculum.py` |
| Modelo `TopicMeta.status` | `Literal[...]` com os 4 valores | `packages/course-parser/src/course_parser/models.py` |
| Escrita do vault | **não existe**; o parser não escreve | — |
| Rota de status | **não existe** | `apps/local-server/src/local_server/routes/courses.py` |
| Geração de aula | **não existe**; só a criação de curso roda a skill | `routes/courses.py` (`_run_course_creation`) |
| Saída da CLI | capturada em `create_course_subprocess` e **descartada** | `services/local_process.py`, `routes/courses.py` |
| CORS | libera só `GET`, `POST`, `DELETE` | `apps/local-server/src/local_server/app.py:31` |
| Jobs | `JobStore` só conhece criação de curso (`CourseCreationJob`) | `services/job_store.py` |
| Tipos gerados | `openapi.json` + `schema.d.ts` precisam ser regerados | `apps/client/package.json` (`generate:types`) |

Contrato que não muda: o formato do `topic-meta` e os valores de `status`
seguem iguais. Por isso **não** há alteração em `skill/references/*` por causa
do contrato. Há, sim, alteração de comportamento na skill (modo não
interativo), que já está documentado em `skill/SKILL.md`, seção "Interaction
mode". Ver Passo 3.

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
| Geração de aula | Rota própria com job, no mesmo modelo da criação de curso | Geração leva dezenas de segundos; sem job o request HTTP estoura o timeout do navegador e do subprocesso (300 s) |
| Resultado do job de aula | Verificar se o arquivo `lessons/<id>-*.md` existe após a execução, **não** pela diferença de pastas | A diferença de pastas (`_existing_slugs`) serve para criar curso. Para uma aula, o artefato esperado é conhecido |
| Decisões pendentes | O servidor extrai as linhas `Pending status decision:` da saída da CLI e as devolve no job | A decisão é do aluno. Expor as linhas pelo job evita que o app tenha de ler arquivos ou logs |
| Diálogo de decisão | Um `Dialog` do shadcn, aberto ao concluir a geração de aula com decisões pendentes, e também ao abrir o curso se houver decisões não respondidas | Cada opção chama a rota de status. Não há decisão automática: sem resposta, nada muda |
| Testes | `pytest` no `course-parser` para a função de escrita; teste de rota no `local-server` com `TestClient` e vault temporário | A lógica de escrita é a parte que pode corromper dados, então merece teste automatizado. O client segue sem runner, como na Feature 4 |

## Estrutura de arquivos

```
packages/course-parser/
  src/course_parser/
    writers/
      __init__.py
      topic_status.py        set_topic_status(text, topic_id, status) -> str   (novo)
  tests/
    test_topic_status.py     (novo)

apps/local-server/src/local_server/
  routes/courses.py          + PATCH status, + POST lesson job, + GET jobs (ajuste)
  services/job_store.py      + campo `kind` e `pending_decisions` no job (modifica)
  services/local_process.py  devolve a saída da CLI (modifica)
  app.py                     CORS: incluir "PATCH" (modifica)
  prompts.py                 prompts de criação e de aula, em um lugar só (novo)
apps/local-server/tests/     (novo) test_status_route.py, test_lesson_job.py

apps/client/src/
  app/api/queries.ts         mutação de status + invalidação (modifica)
  app/api/schema.d.ts        regenerado
  openapi.json               regenerado (apps/client/openapi.json)
  ui/components/trail/       botões de status no TopicCard ou na aula (modifica)
  ui/components/PendingStatusDialog.tsx   (novo)
  app/i18n/locales/{en,pt-BR}.json        chaves de status e do diálogo (modifica)

skill/SKILL.md               nenhuma mudança de texto esperada; confirmar no Passo 3
```

`prompts.py` existe para tirar o texto do prompt de dentro de `routes/courses.py`.
Hoje o prompt de criação está inline; ter dois prompts com regras de modo não
interativo no mesmo arquivo facilita manter os dois iguais.

## Passos

Cada passo termina em um estado verificável e pode virar um commit. Ordem
importa: o Passo 1 não depende de nada, e os Passos 4 e 5 dependem do 1 e do 3.

| # | Passo | Depende de | Verificação |
| --- | --- | --- | --- |
| 1 | Função pura `set_topic_status` no `course-parser` + testes | — | `uv run pytest` |
| 2 | Rota `PATCH /courses/{slug}/topics/{topic_id}/status` | 1 | teste de rota; `uv run pytest` |
| 3 | Modo não interativo: prompt de aula e captura da saída da CLI | — | teste do texto do prompt; execução manual de uma aula |
| 4 | Rota de geração de aula com job | 3 | teste do job com CLI simulada |
| 5 | Extração de `Pending status decision:` e exposição no job | 3, 4 | teste com saída de exemplo |
| 6 | Regerar tipos e verificar o contrato | 2, 4 | `npm run generate:types` + `typecheck` |
| 7 | UI: mutação de status e botões | 6 | `typecheck`, `lint`, `check:i18n`, navegador |
| 8 | UI: diálogo de decisão pendente | 5, 7 | idem, com saída real da skill |
| 9 | Teste manual end-to-end e atualização do SPEC | todos | checklist abaixo |

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
   disso. Se o formato for outro, o parser do Passo 5 muda.

**Por quê:** o SPEC diz que a skill, sem ninguém do outro lado, não pode
perguntar. Sem a declaração explícita no prompt, a skill assume que há usuário
e pergunta, o que trava a execução headless até o timeout de 300 s. O
`SKILL.md` já prevê a declaração; falta o servidor fazê-la.

**Verificação:** teste de que o prompt contém as frases de modo não
interativo; uma execução manual de `build_lesson_prompt` contra um curso de
teste, conferindo que a saída não contém pergunta.

### Passo 4 — Rota de geração de aula com job

**O que fazer:**

1. `POST /courses/{slug}/topics/{topic_id}/lesson` → cria um job e responde
   `202` com o job. Pré-checagens (sincronas): curso existe, tópico existe,
   aula ainda não existe (senão `409`; regerar aula existente é outro
   escopo).
2. `JobStore` ganha o campo `kind` (`course_creation | lesson_generation`) e
   `pending_decisions: list[str]`. Renomear `CourseCreationJob` para `Job` é
   um ajuste pequeno e evita um tipo com nome errado; o OpenAPI muda (ver
   Passo 6).
3. A tarefa de background roda `claude -p` com o prompt do Passo 3, em
   `cwd=VAULT_PATH`, com o mesmo timeout de 300 s.
4. Ao terminar: confirmar que `lessons/<topic_id>-*.md` existe. Se existir, o
   job vira `done`; se não, `error` com a saída da CLI resumida.
5. Extrair as linhas `Pending status decision:` (Passo 5) e guardá-las no job.

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

### Passo 5 — Decisões pendentes

**O que fazer:**

1. Função `parse_pending_decisions(output: str) -> list[PendingDecision]` que
   busca linhas no formato `Pending status decision: <id> <título>`.
2. Chamar essa função ao concluir o job e gravar o resultado em
   `pending_decisions`.
3. Expor `pending_decisions` no `GET /courses/jobs/{job_id}` (agora
   `GET /jobs/{job_id}`, se o Passo 4 renomear a rota).

**Por quê:** o SPEC diz que a decisão é do aluno e não do LLM. O servidor só
transporta a informação; quem decide é a UI. Fazer o parse no servidor, e não
no app, mantém o app livre de conhecer o formato de saída da skill.

**Teste:** saída de exemplo com duas linhas válidas, uma linha parecida mas
inválida (`Pending status decision` sem id) e texto comum; só as válidas devem
ser extraídas.

### Passo 6 — Regerar tipos e conferir o contrato

**O que fazer:** `cd apps/client && npm run generate:types`, depois revisar o
diff de `openapi.json` e `schema.d.ts` e commitar os dois.

**Por quê:** o CLAUDE.md do projeto exige isso ao mudar rotas ou models. O
frontend importa tipos só de `@app/api/client`, então o passo é obrigatório
para o Passo 7 compilar.

**Verificação:** `npm run typecheck`. Um tipo novo sem uso no client já prova
que o OpenAPI saiu certo.

### Passo 7 — UI: mutação de status

**O que fazer:**

1. Em `app/api/queries.ts`, criar `useUpdateTopicStatus(slug)`: mutação com a
   rota do Passo 2 via `openapi-fetch`, e, ao concluir, invalidar a query do
   curso para a trilha e os badges refletirem o status novo.
2. Mostrar um seletor de status na página de aula (`LessonPage`). Motivo de ser
   nela e não na trilha: o card é um `Link` (Feature 5); um controle dentro de
   um link é HTML inválido, o mesmo problema já corrigido em `TopicCard`.
3. Tratar `409` com uma mensagem clara ("gere a aula antes de marcar em
   andamento") e não com erro genérico.
4. Textos em `en.json` e `pt-BR.json`, e `npm run check:i18n`.

**Por quê:** a rota sozinha não entrega valor; o aluno precisa do controle.
Colocar o seletor na aula, e não no card, segue a regra do SPEC de que o
`Link` do card não recebe controles.

### Passo 8 — UI: diálogo de decisão pendente

**O que fazer:**

1. Criar `PendingStatusDialog`, um `Dialog` do shadcn com uma pergunta por
   decisão e três opções: "Concluí" (`completed`), "Quero revisar" (`review`),
   "Ainda estou estudando" (`in_progress`, sem chamada se já estiver assim).
2. Abrir o diálogo quando um job de aula terminar com decisões, e quando o
   aluno abrir o curso e houver decisões ainda não respondidas. Guardar as
   respostas pendentes no próprio job no servidor? **Não** nesta feature: o
   diálogo mostra as decisões que vieram do último job; se o aluno fechar o
   app, a decisão volta a ser pedida na próxima geração. Ver "Decisões em
   aberto", item 2.
3. Cada opção chama a rota do Passo 2 e, depois, fecha a decisão na lista.
4. Sem resposta, nada muda. O diálogo não tem "fechar = concluir".

**Por quê:** a decisão de concluir é do aluno. Um diálogo que assumisse
"concluir" por padrão quebraria essa regra. Usar `Dialog` (Radix) já cuida de
foco e ESC, como na Feature 4.

**Verificação:** `typecheck`, `lint`, `check:i18n`, e navegador com uma
saída real da skill.

### Passo 9 — Teste end-to-end e fechamento

Checklist manual, com um vault de teste (não o vault real):

- [ ] Marcar `pending → completed` pela aula; o arquivo mudou só na linha `status`.
- [ ] Marcar `in_progress` em tópico sem aula: 409 e mensagem clara.
- [ ] Gerar aula pelo app: job vai de `pending` a `running` a `done`; a aula aparece.
- [ ] A saída da skill traz `Pending status decision`; o diálogo abre; cada opção muda o status.
- [ ] Editar o `00-curriculum.md` no editor com CRLF; a rota preserva CRLF.
- [ ] Reiniciar o servidor no meio de um job: o job some e a aula pode ser gerada de novo, sem corromper o currículo.
- [ ] Atualizar o SPEC: marcar os itens da Feature 6, mover o `PATCH` de "Stretch" para "Concluído" (ou remover a duplicata), e registrar as decisões tomadas.

Rodar antes de encerrar, como manda o CLAUDE.md:

```sh
# frontend (em apps/client)
npm run typecheck && npm run lint && npm run check:i18n

# Python (na raiz)
uv run pytest
uv run ruff check packages/course-parser apps/local-server && uv run ruff format --check packages/course-parser apps/local-server
```

## Decisões em aberto

Estas decisões precisam do Samuel antes do Passo correspondente. Cada uma tem
uma recomendação.

1. **A rota de status deve também marcar os checkboxes dos subtópicos quando o
   status vira `completed`?** A skill faz isso ao concluir (SKILL.md,
   "Finished"), mas o SPEC restringe a rota à linha `status`.
   *Recomendação:* não. Manter a rota pequena. Se o aluno marca `completed` no
   app, os checkboxes ficam para trás até ele editar à mão ou a skill rodar de
   novo. Isso deixa o estado do currículo inconsistente por um tempo; aceito
   nesta feature, e a inconsistência fica registrada no SPEC.
   *Alternativa:* atualizar também os checkboxes. Mais coerente, mas a rota
   passa a editar mais de uma linha, e o risco de erro cresce.

2. **O que acontece com as decisões pendentes se o aluno fechar o app?**
   *Recomendação:* não persistir. As decisões voltam a aparecer na próxima
   geração de aula. Persistir exigiria saber quando a decisão expirou, e o
   vault já guarda o status real.

3. **`last_reviewed` deve ser atualizado pela rota?** O SPEC diz que `last_reviewed`
   é definido ao gerar ou revisar a aula. *Recomendação:* não atualizar nesta
   rota; o campo passa a ser atualizado só pela skill, como hoje.

4. **O app deve mostrar o botão "Gerar aula" em tópicos sem aula?**
   *Recomendação:* sim, na página de aula, com o estado "aula não gerada" já
   existente (404). É o ponto de entrada natural do Passo 4.

## Riscos

- **Formato de saída da CLI.** Se `--output-format json` não devolver o texto
  final num campo previsível, o Passo 5 precisa de outro parser. Mitigação: o
  Passo 3 verifica isso antes de qualquer código dependente.
- **Corrida entre Obsidian e o servidor.** A escrita atômica evita arquivo
  corrompido, mas não impede que o Obsidian sobrescreva a mudança se gravar
  depois. Aceito; é o risco já registrado em "Decisões adiadas".
- **Skill ignorar o modo não interativo.** Se a skill perguntar mesmo com a
  declaração, o job trava até o timeout. Mitigação: o Passo 3 testa com uma
  execução real antes da UI.
- **Dois jobs no mesmo curso.** Mitigado pela recusa de segundo job por
  `slug` (Passo 4). Não há lock de arquivo.
