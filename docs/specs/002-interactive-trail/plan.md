# Plan: Feature 4 — Trilha interativa

Especificação de origem: [`docs/SPEC.md`](../../SPEC.md), "Feature 4 — Trilha interativa".

## Contexto

Hoje o currículo aparece em `CoursePage` como lista de cards (módulo → tópico →
subtópicos, somente leitura). A trilha é uma visão **visual dentro da própria
página**, no estilo [roadmap.sh](https://roadmap.sh/frontend): os módulos formam
uma linha vertical (a "espinha"), os tópicos saem de cada módulo, e a cor/ícone
de cada tópico mostra o `status` real do currículo. Clicar num tópico abre um
painel lateral com os subtópicos.

**Entrega:** trilha visual refletindo o estado real do currículo, que rola
junto com a página (sem caixa com zoom/arrastar).

**Fora do escopo:**

- Rota nova na API (tudo já vem em `GET /courses/{slug}`), mudança em
  `topic-meta` ou em models Pydantic. Logo, **não** é preciso regerar tipos nem
  mexer em `skill/references/*`.
- Pré-requisitos explícitos. O currículo não tem esse campo (só prosa tipo
  "builds on 2.3"); criá-lo obrigaria atualizar skill + parser + tipos TS.
  Fica para uma feature própria. Por isso a trilha não desenha setas entre
  tópicos: a ordem do currículo já é a ordem da página.
- Página de aula (Feature 5) e edição de status (Feature 6).

## Mudança de rumo (2026-10-18)

A primeira versão usava `@xyflow/react` (React Flow) + `@dagrejs/dagre` e foi
implementada até o Passo 4 original. Ao ver o resultado, o Samuel descartou a
abordagem: o React Flow é um **canvas** (caixa com zoom e arrastar). Em cursos
grandes (`ai-engineer`: 65 nós, ~4050 px de largura) o aluno precisa navegar
dentro da caixa para achar o conteúdo, quando o desejado é rolar a página
normalmente. Também não se adapta bem a celular.

Decisão: trilha em **HTML/CSS no fluxo da página**. Não há dependência de
grafo, nem cálculo de layout: o navegador faz o layout. `buildTrail`,
`layoutTrail`, React Flow e dagre saem do projeto (o histórico no Git preserva
tudo). `statusStyle.ts` e o visual dos nós de tópico e módulo são aproveitados.

## Decisões de design (e por quê)

| Decisão | Escolha | Motivo |
| --- | --- | --- |
| Renderização | HTML/CSS (Tailwind) no fluxo da página | Rola com a página, responsivo, acessível por teclado e leitor de tela, zero dependência nova |
| Forma | Timeline vertical: linha (espinha) à esquerda, cada módulo com um marcador na linha e seus tópicos em grade logo abaixo | Mostra a ordem do currículo sem inventar dependências; no celular vira uma coluna |
| Tópico | `<button>` (card) com ícone, id, título e cor por status | Clicável e focável por padrão; abre o painel lateral |
| Estado de seleção | `useState<string \| null>` com o **id** do tópico (`"1.1"`) | O id sobrevive a refetch (staleTime 30 s / foco); guardar o objeto deixaria o painel com status velho |
| Convivência com a lista | Alternância `Trilha` / `Lista` em `CoursePage`, estado em `?view=trail\|list` (padrão `trail`) | A lista tem detalhes (weak points, badges) que a trilha não mostra; a URL permite compartilhar/recarregar na mesma visão. Sem componente `Tabs` novo |
| Painel lateral | `Sheet` do shadcn (Radix Dialog) | Já cuida de foco, ESC e mobile; evita reinventar overlay |
| Link para a aula | Painel mostra se há aula/exercícios, **sem link** nesta feature | A rota da página de aula só existe na Feature 5. O link entra lá (ponto de extensão: `TopicPanel`) |
| Testes | **Sem testes automatizados nesta feature** (decisão do Samuel) | O web não tem runner. Verificação: `typecheck` + `lint` + `check:i18n` + checagem manual |

## Estrutura de arquivos

```
apps/web/src/
  ui/components/trail/
    statusStyle.ts      status -> { icon, className }   (já existe)
    TopicCard.tsx       card clicável de um tópico      (substitui TopicNode)
    ModuleSection.tsx   marcador do módulo + grade de TopicCard (substitui ModuleNode)
    Trail.tsx           timeline completa + legenda + seleção (substitui TrailGraph)
    TrailLegend.tsx     legenda de status + contagens (usa computeProgress)
    TopicPanel.tsx      Sheet com subtópicos, badges de aula/exercícios
  ui/pages/CoursePage.tsx   alterna Trilha/Lista (modifica)
  app/i18n/locales/{en,pt-BR}.json   chaves trail.* (modifica)
```

Removidos: `app/lib/trail.ts`, `app/lib/trailLayout.ts`,
`ui/components/trail/{TrailGraph,TopicNode,ModuleNode}.tsx` e as dependências
`@xyflow/react` e `@dagrejs/dagre`.

## Passos

| # | Passo | Quem | Status |
| --- | --- | --- | --- |
| 1-4 | `buildTrail`, `layoutTrail`, React Flow, nós customizados | Samuel | ✅ feitos e descartados (ver "Mudança de rumo") |
| 5 | Limpeza: remover React Flow, dagre, `trail.ts`, `trailLayout.ts` | Samuel | ⬜ |
| 6 | `TopicCard`, `ModuleSection` e `Trail` (timeline em HTML/CSS) | Samuel | ⬜ |
| 7 | Legenda de status (`TrailLegend`) | Claude | ⬜ |
| 8 | Painel lateral (`TopicPanel`) | Samuel | ⬜ |
| 9 | Integrar em `CoursePage` (alternância + URL) | Claude | ⬜ |
| 10 | i18n, verificação final e atualização do SPEC | Claude | ⬜ |

Claude revisa cada passo do Samuel antes do seguinte, conferindo no navegador
quando autorizado.

### Passo 5 — Limpeza

1. `npm uninstall @xyflow/react @dagrejs/dagre` em `apps/web`.
2. Apagar `app/lib/trail.ts`, `app/lib/trailLayout.ts` e
   `ui/components/trail/TrailGraph.tsx`. `TopicNode.tsx` e `ModuleNode.tsx`
   podem ficar até o Passo 6 como referência de visual, mas importam
   `@xyflow/react`: renomeie/transforme-os no Passo 6, não deixe o projeto sem
   compilar entre os commits.
3. Em `CoursePage.tsx`, remover o `<TrailGraph>` temporário (o componente novo
   entra no Passo 9).
4. `npm run typecheck && npm run lint`. Commit:
   `refactor(web): drop React Flow in favor of an in-page trail`.

### Passo 6 — Timeline em HTML/CSS

- `TopicCard({ topic, onSelect })`: `<button type="button">` com ícone e cores
  de `STATUS_STYLE[status]`, id em fonte mono, título com `line-clamp-2`,
  `aria-label` com título + status traduzido, `focus-visible` com anel.
- `ModuleSection({ index, module, onSelectTopic })`: `<li>` com marcador
  (círculo) sobre a linha da espinha, título `t('course.module', ...)`,
  descrição do módulo e `<ul>` com grade responsiva
  (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) de `TopicCard`.
- `Trail({ course })`: `<ol>` com a espinha (`border-l`) e uma
  `ModuleSection` por módulo, `selectedId` em `useState`. Curso sem módulos:
  mensagem de vazio.
- A cor do tema vem das classes `dark:` (não há `colorMode` para repassar).

### Passo 7 — Legenda

`TrailLegend` recebe `byStatus` de `computeProgress(course)` e lista
ícone + rótulo + contagem para os 4 status. Sem lógica nova de agregação.

### Passo 8 — Painel lateral

Adicionar o `Sheet` com o CLI do shadcn. Antes de qualquer comando, rodar
`npx shadcn@latest info --cwd apps/web` e passar `--cwd apps/web` nos
comandos (regra do `CLAUDE.md`); conferir a capitalização do arquivo gerado
(o projeto usa PascalCase em `components/ui/`).

`TopicPanel({ topic, hasLesson, hasExercises, open, onOpenChange })`: título,
`StatusBadge`, dificuldade percebida, weak points, lista de subtópicos
(checkbox somente leitura, como em `CoursePage`) e badges de aula/exercícios.
`Trail` guarda o id selecionado e resolve o tópico a cada render a partir de
`course` (assim o painel reflete refetch). Fechar o painel limpa a seleção.
`hasLesson`/`hasExercises` vêm dos mesmos `Set`s de `CoursePage`
(`lessons.map(l => l.topic)`), passados por props.

### Passo 9 — Integração

`CoursePage`: alternância `Trilha | Lista` (dois `Button` com `variant`
ativo/ghost, `aria-pressed`) lendo/escrevendo `?view=` com `useSearchParams` do
`react-router`. Valor inválido cai em `trail`. O bloco "Currículo" atual passa a
ser a visão `list`. Progresso e visão geral ficam acima das duas visões.

### Passo 10 — Fechamento

- Chaves `trail.*` em `en.json` **e** `pt-BR.json` (título da seção, rótulos
  Trilha/Lista, legenda, textos do painel, `aria-label`s). Nenhum texto fixo
  em componente.
- Atualizar `docs/SPEC.md`: marcar os itens da Feature 4, mover para
  "Concluído", atualizar a árvore de `src/` (seção 6.1) e as rotas/fluxos (6.2,
  6.4).
- Atualizar o status desta tabela.

## Edge cases (verificação manual)

1. Curso sem módulos ou módulo sem tópicos: sem erro, mensagem de vazio.
2. Curso grande (`ai-engineer`, 12 módulos, 65 nós): página longa mas fluida,
   sem rolagem horizontal.
3. Títulos longos: `line-clamp` no card e título completo no painel.
4. Refetch (staleTime 30 s / foco) com painel aberto: seleção por **id**
   sobrevive e o painel reflete o status novo.
5. Tema escuro e idioma pt-BR: contraste dos 4 status e `aria-label` traduzidos.
6. Celular (~375 px): uma coluna, sem rolagem horizontal, `Sheet` na largura toda.
7. Teclado: Tab percorre os cards, Enter/Espaço abre o painel, ESC fecha e o foco
   volta ao card.
8. `?view=` inválido ou ausente → trilha.

## Verificação final

```sh
# apps/web
npm run typecheck && npm run lint && npm run check:i18n
```

Manual (`./run.sh` com um vault real):

1. `/courses/<slug>` abre na trilha; cores batem com os badges da lista.
2. Mudar um `status` no `00-curriculum.md` pelo Obsidian, voltar à aba (refetch
   no foco) → o card muda de cor sem F5.
3. Clicar no card abre o painel com os subtópicos corretos; ESC fecha.
4. Alternar Trilha/Lista, recarregar com `?view=list` → continua na lista.
5. Repetir em pt-BR, tema escuro e janela estreita.
6. `grep -rnE "[ãõçáéíóúâêô]" src/ui/components/trail` → vazio (nada hardcoded).

## Referências

- Tailwind: [Grid](https://tailwindcss.com/docs/grid-template-columns), [Responsive design](https://tailwindcss.com/docs/responsive-design).
- shadcn: [Sheet](https://ui.shadcn.com/docs/components/sheet).
- MDN: [`<button>`](https://developer.mozilla.org/docs/Web/HTML/Element/button), [`:focus-visible`](https://developer.mozilla.org/docs/Web/CSS/:focus-visible).
