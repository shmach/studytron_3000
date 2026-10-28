# Plan: Revisão final (Features 6 e 7)

> **Status: a fazer.** Não é uma feature: nenhum código novo é entregue aqui. É a etapa que
> valida, de ponta a ponta, o que as Features 6 e 7 construíram, antes de dar o ciclo por
> encerrado. Reúne o Passo 4 (teste manual) e o Passo 5 (concorrência) do plano
> [`004-feedback-de-jobs`](../004-feedback-de-jobs/plan.md). Origem:
> [`docs/SPEC.md`](../../SPEC.md), seção 9, "Revisão final".

## Contexto

As Features 6 e 7 foram verificadas com testes automatizados e, na interface, com uma CLI
simulada. Falta o que só a CLI real e o uso simultâneo mostram: o tempo real de geração, a
saída real da skill (`Pending status decision`) e o comportamento da trava de um job por
curso sob concorrência. Um bug achado aqui vira correção avulsa, não uma feature nova.

**Critério de saída:** o checklist da Parte 1 todo marcado, a Parte 2 sem arquivo corrompido
e sem job preso em `running`, e `SPEC.md` atualizado com os tempos medidos.

## Parte 1 — Teste manual de ponta a ponta

Sempre com um vault de teste, nunca o vault real. Como montá-lo:
[`004-feedback-de-jobs/plan.md`](../004-feedback-de-jobs/plan.md), seção "Como verificar a
interface sem tocar no vault real".

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

Itens que **não** gastam uso da CLI: toast de erro (sem `claude` no `PATH`), painel que some
(job simulado) e CRLF. Os demais dependem da CLI real e levam minutos cada.

## Parte 2 — Testes de concorrência

Hoje a trava de um job por curso só tem testes de unidade (`JobStore` e rotas com CLI
simulada). O roteiro (decisão do Samuel em 2026-10-25: depois de toda a implementação):

- [ ] duas gerações ao mesmo tempo no mesmo curso: uma `202`, a outra `409`;
- [ ] duas gerações em cursos diferentes ao mesmo tempo: as duas seguem;
- [ ] mudança de status durante uma geração (pela API direto, já que a UI bloqueia);
- [ ] duas abas do app abertas, uma gerando e a outra tentando gerar ou mudar status;
- [ ] edição do `00-curriculum.md` no Obsidian durante a escrita da skill;
- [ ] reinício do servidor com um job em andamento (o job some; a geração pode ser repetida
      sem corromper o currículo);
- [ ] muitas requisições de `PATCH` de status em paralelo no mesmo arquivo.

O critério é **nenhum arquivo corrompido e nenhum job preso em `running`**. Os itens que
puderem virar teste automatizado (`pytest`) devem virar; os de duas abas e do Obsidian são
manuais.

## Fechamento

Rodar antes de encerrar, como manda o CLAUDE.md:

```sh
# frontend (em apps/client)
npm run typecheck && npm run lint && npm run check:i18n

# Python (na raiz)
uv run pytest
uv run ruff check packages/course-parser apps/local-server && uv run ruff format --check packages/course-parser apps/local-server
```

Depois: registrar aqui os tempos medidos e os bugs achados, atualizar "Tempos medidos de
geração" no `SPEC.md` e marcar a revisão como encerrada.

## Registro

_Vazio até a revisão acontecer._
