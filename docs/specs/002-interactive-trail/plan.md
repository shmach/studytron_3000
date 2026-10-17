# Plan: Feature 4 — Trilha interativa

Especificação de origem: [`docs/SPEC.md`](../../SPEC.md), "Feature 4 — Trilha interativa".

## Contexto

Hoje o currículo aparece em `CoursePage` como lista de cards (módulo → tópico →
subtópicos, somente leitura). A trilha é uma visão em **grafo navegável**, no
estilo [roadmap.sh](https://roadmap.sh/frontend): módulos formam uma espinha
vertical, os tópicos saem de cada módulo, e a cor/ícone de cada tópico mostra o
`status` real do currículo. Clicar num tópico abre um painel lateral com os
subtópicos.

**Entrega:** trilha visual navegável refletindo o estado real do currículo.

**Fora do escopo:**

- Rota nova na API (tudo já vem em `GET /courses/{slug}`), mudança em
  `topic-meta` ou em models Pydantic. Logo, **não** é preciso regerar tipos nem
  mexer em `skill/references/*`.
- Pré-requisitos explícitos. O currículo não tem esse campo (só prosa tipo
  "builds on 2.3"); criá-lo obrigaria atualizar skill + parser + tipos TS.
  Fica para uma feature própria.
- Página de aula (Feature 5) e edição de status (Feature 6).

## Decisões de design (e por quê)

| Decisão | Escolha | Motivo |
| --- | --- | --- |
| Biblioteca do grafo | `@xyflow/react` (React Flow) | Já definida no SPEC; zoom/pan, nós customizados em React, acessível por teclado |
| Layout automático | `@dagrejs/dagre` | Síncrono, ~30 KB, suficiente para árvore/DAG pequeno. `elkjs` é assíncrono (Web Worker) e pesado; só compensaria com grafos enormes |
| Forma do grafo | Nós de **módulo** em espinha (`módulo N → módulo N+1`) e nós de **tópico** ligados ao seu módulo (`módulo → cada tópico`) | Sem pré-requisitos reais nos dados, ligar tópico→tópico inventaria dependências. A ordem do currículo já está na espinha |
| Lógica do grafo | Função pura `buildTrail(course)` separada do componente | Fácil de raciocinar e de testar no futuro; o componente só desenha. Mesmo espírito de `lib/progress.ts` |
| Posicionamento | Função separada `layoutTrail(nodes, edges)` | dagre só calcula `x/y`; trocar de lib depois não toca em `buildTrail` |
| Convivência com a lista | Alternância `Trilha` / `Lista` em `CoursePage`, estado em `?view=trail\|list` (padrão `trail`) | A lista tem detalhes (weak points, badges) que a trilha não mostra; a URL permite compartilhar/recarregar na mesma visão. Sem componente `Tabs` novo |
| Painel lateral | `Sheet` do shadcn (Radix Dialog) | Já cuida de foco, ESC e mobile; evita reinventar overlay |
| Link para a aula | Painel mostra se há aula/exercícios, **sem link** nesta feature | A rota da página de aula só existe na Feature 5. O link entra lá (ponto de extensão: `TopicPanel`). Evita link quebrado |
| Testes | **Sem testes automatizados nesta feature** (decisão do Samuel) | O web não tem runner e não será adicionado agora. A verificação é `typecheck` + `lint` + checagem manual. As funções puras continuam separadas, então testes podem entrar depois sem refactor |
| Nó de tópico | Id do nó = `topic.meta.id` (`"1.1"`); id do módulo = `module-<n>` | Estável entre refetches (o React Flow preserva seleção/posição) e permite casar com `lessons`/`exercise_sets` |

## Estrutura de arquivos

```
apps/web/src/
  app/lib/
    trail.ts            buildTrail(course): { nodes, edges }   (puro, sem React)
    trailLayout.ts      layoutTrail(nodes, edges): nodes com position (dagre)
  ui/components/trail/
    TrailGraph.tsx      <ReactFlow> + controles + seleção
    ModuleNode.tsx      nó customizado de módulo
    TopicNode.tsx       nó customizado de tópico (cor/ícone por status)
    TrailLegend.tsx     legenda de status + contagens (usa computeProgress)
    TopicPanel.tsx      Sheet com subtópicos, badges de aula/exercícios
    statusStyle.ts      mapa status -> { icon, className } (compartilhado)
  ui/pages/CoursePage.tsx   alterna Trilha/Lista (modifica)
  app/i18n/locales/{en,pt-BR}.json   chaves trail.* (modifica)
```

`statusStyle.ts` concentra as classes de cor para a trilha. As cores devem
seguir as de `StatusBadge.tsx` (cinza / azul / verde / âmbar); se ficarem
iguais demais, extrair um mapa comum é um refactor válido, mas não obrigatório.

## Modelo de dados do grafo

Tipos em `app/lib/trail.ts` (derivados dos tipos de `@app/api/client`, nunca de
`schema.d.ts`):

```ts
type TrailNodeData =
  | { kind: 'module'; index: number; title: string; topicCount: number }
  | { kind: 'topic'; topic: Topic; moduleIndex: number };

interface TrailNode { id: string; data: TrailNodeData }   // sem position
interface TrailEdge { id: string; source: string; target: string; kind: 'spine' | 'branch' }
```

`buildTrail(course: Course): { nodes: TrailNode[]; edges: TrailEdge[] }`:

- 1 nó por módulo (`module-1`…) e 1 por tópico (`topic.meta.id`).
- Aresta `spine`: `module-i → module-(i+1)`.
- Aresta `branch`: `module-i → <cada tópico do módulo i>`.
- Ordem dos nós = ordem do currículo.

`layoutTrail(nodes, edges, size)` devolve `{ id, position: {x, y} }[]` usando
`rankdir: 'TB'`. O tamanho do nó (largura/altura) é constante exportada, usada
tanto pelo dagre quanto pelo CSS dos nós, para não divergirem.

## Passos

| # | Passo | Quem | Status |
| --- | --- | --- | --- |
| 1 | `buildTrail` (modelo do grafo) | Samuel | ⬜ |
| 2 | `layoutTrail` com dagre | Samuel | ⬜ |
| 3 | Instalar React Flow e renderizar o grafo cru | Samuel | ⬜ |
| 4 | Nós customizados (`ModuleNode`, `TopicNode`) com status | Samuel | ⬜ |
| 5 | Legenda de status | Claude | ⬜ |
| 6 | Painel lateral (`TopicPanel`) | Samuel | ⬜ |
| 7 | Integrar em `CoursePage` (alternância + URL) | Claude | ⬜ |
| 8 | i18n, verificação final e atualização do SPEC | Claude | ⬜ |

Samuel escreve os passos que ensinam algo novo (React Flow, dagre, testes no
front); Claude revisa cada um antes do seguinte e faz os mecânicos.

### Passo 1 — `buildTrail` (modelo do grafo)

**Objetivo:** ter o modelo do grafo, sem React nem biblioteca de grafo.

1. Criar `src/app/lib/trail.ts` com os tipos `TrailNodeData`, `TrailNode` e
   `TrailEdge` (seção "Modelo de dados do grafo") e a função
   `buildTrail(course: Course): { nodes: TrailNode[]; edges: TrailEdge[] }`.
   Importar `Course` e `Topic` de `@app/api/client`, nunca de `schema.d.ts`.
2. Regras: 1 nó por módulo (`module-1`…) e 1 por tópico (`topic.meta.id`);
   aresta `spine` `module-i → module-(i+1)`; aresta `branch` do módulo para cada
   um dos seus tópicos; nós na ordem do currículo.
3. Casos que não podem quebrar: curso sem módulos devolve `{ nodes: [], edges: [] }`;
   módulo sem tópicos gera só o nó do módulo.
4. Conferir a olho: chamar `buildTrail` num `console.log` temporário (ou no
   Passo 3) com um curso real e comparar com o currículo. Remover o log antes
   do commit.
5. `npm run typecheck && npm run lint`.
6. Commit: `feat(web): add buildTrail graph model`.

### Passo 2 — `layoutTrail` com dagre

`npm i @dagrejs/dagre`. Função `layoutTrail` em `app/lib/trailLayout.ts`
(assinatura na seção "Modelo de dados"). Conferência manual no Passo 3: todo nó
recebe `position` finita, `module-2` fica abaixo de `module-1` e tópicos irmãos
não se sobrepõem. Commit `feat(web): add dagre layout for the trail`.

### Passo 3 — React Flow cru

`npm i @xyflow/react`. Importar `@xyflow/react/dist/style.css` uma vez
(em `TrailGraph.tsx`). `TrailGraph({ course })` chama `buildTrail` +
`layoutTrail` dentro de `useMemo` e renderiza `<ReactFlow nodes edges fitView>`
com `Controls` e `Background`. O contêiner precisa de **altura explícita**
(ex.: `h-[70vh]`) — sem isso o React Flow renderiza vazio, é o erro mais comum.
Ainda com nós padrão (sem customização). Montar temporariamente em
`CoursePage` só para ver funcionando. Sem commit de UI final ainda: commit
`feat(web): render the trail graph with React Flow`.

### Passo 4 — Nós customizados

`TopicNode` e `ModuleNode` registrados em `nodeTypes` (objeto **fora** do
componente, ou memoizado — criar a cada render faz o React Flow recriar todos
os nós). `TopicNode` mostra id, título, ícone e cor por status (`statusStyle.ts`),
com `Handle` de entrada no topo. Nós são botões acessíveis: `aria-label` com
título + status traduzido (`t('status.<status>')`). Cores com variante `dark:`.
Passar `colorMode` do React Flow acompanhando o tema (`ThemeContext`).

### Passo 5 — Legenda

`TrailLegend` recebe `byStatus` de `computeProgress(course)` e lista
ícone + rótulo + contagem para os 4 status. Sem lógica nova de agregação.

### Passo 6 — Painel lateral

Adicionar o `Sheet` com o CLI do shadcn. Antes de qualquer comando, rodar
`npx shadcn@latest info --cwd apps/web` e passar `--cwd apps/web` nos
comandos (regra do `CLAUDE.md`); conferir a capitalização do arquivo gerado
(o projeto usa PascalCase em `components/ui/`).

`TopicPanel({ topic, hasLesson, hasExercises, open, onOpenChange })`: título,
`StatusBadge`, dificuldade percebida, weak points, lista de subtópicos
(checkbox somente leitura, como em `CoursePage`) e badges de aula/exercícios.
`TrailGraph` guarda o tópico selecionado em `useState<string | null>` (id) e
passa `onNodeClick`. Fechar o painel limpa a seleção.
`hasLesson`/`hasExercises` vêm dos mesmos `Set`s de `CoursePage`
(`lessons.map(l => l.topic)`); passar via props, não recalcular.

### Passo 7 — Integração

`CoursePage`: alternância `Trilha | Lista` (dois `Button` com
`variant` ativo/ghost, `aria-pressed`) lendo/escrevendo `?view=` com
`useSearchParams` do `react-router`. Valor inválido cai em `trail`.
O bloco "Currículo" atual passa a ser a visão `list`. Progresso e visão geral
ficam acima das duas visões, como hoje.

### Passo 8 — Fechamento

- Chaves `trail.*` em `en.json` **e** `pt-BR.json` (título da seção, rótulos
  Trilha/Lista, legenda, textos do painel, `aria-label`s). Nenhum texto fixo
  em componente.
- Atualizar `docs/SPEC.md`: marcar os itens da Feature 4, mover para
  "Concluído", atualizar a árvore de `src/` (seção 6.1) e as rotas/fluxos (6.2,
  6.4), sem mudanças em "Tooling".
- Atualizar o status desta tabela.

## Edge cases (verificação manual)

1. Curso sem módulos ou módulo sem tópicos: sem erro, mensagem de vazio na trilha.
2. Curso grande (`deep`, 8+ módulos × 5 tópicos): `fitView` legível, zoom mínimo
   suficiente, sem travar.
3. Títulos longos: nó com `truncate`/`line-clamp` e título completo no painel.
4. Refetch (staleTime 30 s / foco) com painel aberto: seleção por **id** sobrevive
   e o painel reflete o status novo.
5. Tema escuro e idioma pt-BR: contraste dos status e `aria-label` traduzidos.
6. Mobile: grafo navegável por toque, `Sheet` ocupa a largura, controles não
   cobrem a legenda.
7. Navegação por teclado: Tab chega aos nós, Enter abre o painel, ESC fecha.
8. `?view=` inválido ou ausente → trilha.

## Verificação final

```sh
# apps/web
npm run typecheck && npm run lint && npm run check:i18n
```

Manual (`./run.sh` com um vault real, ex.: `arduino-cpp`):

1. `/courses/<slug>` abre na trilha; cores batem com os badges da lista.
2. Mudar um `status` no `00-curriculum.md` pelo Obsidian, voltar à aba (refetch
   no foco) → o nó muda de cor sem F5.
3. Clicar no nó abre o painel com os subtópicos corretos; ESC fecha.
4. Alternar Trilha/Lista, recarregar com `?view=list` → continua na lista.
5. Repetir em pt-BR, tema escuro e janela estreita.
6. `grep -rnE "[ãõçáéíóúâêô]" src/ui/components/trail` → vazio (nada hardcoded).

## Referências

- React Flow: [Quick start](https://reactflow.dev/learn), [Custom nodes](https://reactflow.dev/learn/customization/custom-nodes), [Layouting (dagre)](https://reactflow.dev/learn/layouting/layouting), [Performance](https://reactflow.dev/learn/advanced-use/performance) (por que `nodeTypes` fica fora do render).
- dagre: [wiki da API](https://github.com/dagrejs/dagre/wiki).
- shadcn: [Sheet](https://ui.shadcn.com/docs/components/sheet).
