---
course: "Java para quem já programa"
slug: "java-para-quem-programa"
created: 2026-08-30
depth: standard          # quick | standard | deep
level: beginner           # iniciante em Java, mas experiente em programação
goal: "Aprender Java com solidez (sintaxe, OOP, coleções, exceções, streams) para uso geral, sem repetir fundamentos de programação já conhecidos"
language: pt-BR
---

# Java para quem já programa

> Curso para quem já sabe programar (variáveis, laços, condicionais, funções) e
> quer aprender Java do zero na linguagem em si: sintaxe, o modelo de objetos,
> o sistema de tipos, a biblioteca padrão, tratamento de erros e os recursos
> modernos da linguagem (lambdas, streams, records). Ao final, o aluno deve
> conseguir ler, escrever e depurar programas Java de porte pequeno/médio e
> entender o ecossistema (JVM, build tools) o suficiente para seguir para
> qualquer área (backend, Android, etc.) por conta própria.

## Module 1 — Ecossistema e primeiros programas

Antes de escrever Java "de verdade", é preciso entender como o código roda
(JVM, JDK) e como um programa Java é estruturado — isso é o que mais difere
de outras linguagens que o aluno já conhece.

### 1.1 JVM, JDK e o modelo de execução

```topic-meta
id: "1.1"
status: completed
perceived_difficulty:
weak_points: []
last_reviewed: 2026-08-30
```

- [ ] **1.1.1 O que é a JVM e por que Java compila para bytecode** — explicar
  compilação (.java → .class), portabilidade "write once run anywhere", e a
  diferença entre JDK, JRE e JVM.
- [ ] **1.1.2 Compilando e executando pela linha de comando** — usar `javac`
  e `java` diretamente, sem IDE, para o aluno entender o que a IDE faz por
  baixo dos panos.
- [ ] **1.1.3 Panorama das ferramentas de build (Maven/Gradle)** — visão
  geral do que são e por que existem, sem entrar em configuração detalhada
  ainda (fica para exercícios práticos mais à frente).

### 1.2 Estrutura de um programa Java

```topic-meta
id: "1.2"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **1.2.1 Classes, o método main e arquivos-fonte** — regra de "uma
  classe pública por arquivo", assinatura do `main`, convenção de nomes.
- [ ] **1.2.2 Pacotes (packages) e imports** — como Java organiza namespaces,
  comparando com o que o aluno já conhece de módulos/imports em outra
  linguagem.
- [ ] **1.2.3 Sintaxe básica e pontuação da linguagem** — chaves, ponto e
  vírgula, blocos, comentários — revisão rápida focada no que é diferente do
  que o aluno já está acostumado.

### 1.3 Tipos primitivos, variáveis e operadores

```topic-meta
id: "1.3"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **1.3.1 Tipos primitivos de Java** — `int`, `long`, `double`, `boolean`,
  `char`, etc., tamanhos e faixas de valores, tipagem estática forte.
- [ ] **1.3.2 Primitivo vs tipo referência** — a distinção fundamental de
  Java entre valores primitivos e objetos, e por que isso importa (stack vs
  heap, passagem por valor).
- [ ] **1.3.3 Operadores e conversões (casting)** — operadores aritméticos,
  lógicos, de comparação; conversão implícita vs `cast` explícito entre
  tipos numéricos.

## Module 2 — Orientação a objetos em Java

Java é fortemente orientado a objetos e impõe uma sintaxe e convenções
próprias para isso. Este módulo assume que o aluno já entende os conceitos
de OOP (classe, objeto, herança) e foca em como Java especificamente os
expressa.

### 2.1 Classes e objetos

```topic-meta
id: "2.1"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **2.1.1 Definindo classes, atributos e construtores** — sintaxe de
  classes em Java, sobrecarga de construtores, `this`.
- [ ] **2.1.2 Modificadores de acesso e encapsulamento** — `private`,
  `public`, `protected`, pacote-privado, e a convenção getters/setters.
- [ ] **2.1.3 Membros estáticos vs de instância** — `static` em campos e
  métodos, quando usar cada um.

### 2.2 Herança e polimorfismo

```topic-meta
id: "2.2"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **2.2.1 Herança com `extends`** — sintaxe, `super`, sobrescrita
  (`@Override`) vs sobrecarga de métodos.
- [ ] **2.2.2 Polimorfismo e binding dinâmico** — como Java resolve qual
  método chamar em tempo de execução, `instanceof`.
- [ ] **2.2.3 Classe `Object` e métodos universais** — `equals`, `hashCode`,
  `toString`, e por que sobrescrevê-los corretamente importa.

### 2.3 Interfaces e classes abstratas

```topic-meta
id: "2.3"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **2.3.1 Classes abstratas** — quando usar, sintaxe, métodos abstratos
  vs concretos.
- [ ] **2.3.2 Interfaces** — contrato puro, métodos default e estáticos em
  interfaces (Java moderno), múltipla implementação.
- [ ] **2.3.3 Abstract class vs interface: quando escolher cada uma** —
  critérios práticos de design, comparação direta.

## Module 3 — Strings, arrays e tipos utilitários

Antes de ir para coleções, o aluno precisa dominar os blocos de dados mais
usados no dia a dia: strings, arrays e os tipos "wrapper" que fazem a ponte
entre primitivos e objetos.

### 3.1 Strings em Java

```topic-meta
id: "3.1"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **3.1.1 Imutabilidade de String e o string pool** — por que `String`
  é imutável, comparação com `==` vs `.equals()`, pool de literais.
- [ ] **3.1.2 Métodos comuns de String** — manipulação, formatação
  (`String.format`, text blocks), concatenação eficiente.
- [ ] **3.1.3 StringBuilder** — quando e por que usar em vez de concatenar
  Strings diretamente em loops.

### 3.2 Arrays

```topic-meta
id: "3.2"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **3.2.1 Declarando e usando arrays** — sintaxe, tamanho fixo,
  arrays multidimensionais.
- [ ] **3.2.2 Arrays de primitivos vs de objetos** — implicações de memória
  e valores padrão (`0`, `null`, `false`).
- [ ] **3.2.3 Utilitários de `java.util.Arrays`** — ordenação, busca,
  cópia, comparação.

### 3.3 Wrapper classes e autoboxing

```topic-meta
id: "3.3"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **3.3.1 Classes wrapper (`Integer`, `Double`, etc.)** — por que
  existem, cache de `Integer` para valores pequenos.
- [ ] **3.3.2 Autoboxing e unboxing** — conversão automática e suas
  armadilhas (ex: `NullPointerException` ao fazer unboxing de `null`).

## Module 4 — Coleções e Generics

O Collections Framework é a base de qualquer programa Java real. Generics é
o que torna essas coleções seguras em tempo de compilação — os dois andam
juntos e merecem um módulo dedicado.

### 4.1 Generics

```topic-meta
id: "4.1"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **4.1.1 Por que Generics existem** — o problema que resolvem
  (segurança de tipos em tempo de compilação, eliminar casts manuais).
- [ ] **4.1.2 Sintaxe de tipos genéricos** — `<T>`, classes e métodos
  genéricos, wildcards básicos (`? extends`, `? super`).

### 4.2 List, Set e Map

```topic-meta
id: "4.2"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **4.2.1 Interface `List` e implementações** — `ArrayList` vs
  `LinkedList`, quando usar cada uma.
- [ ] **4.2.2 Interface `Set` e implementações** — `HashSet`, `LinkedHashSet`,
  `TreeSet`, unicidade e ordenação.
- [ ] **4.2.3 Interface `Map` e implementações** — `HashMap`, `LinkedHashMap`,
  `TreeMap`, pares chave-valor.

### 4.3 Iteração, ordenação e comparação

```topic-meta
id: "4.3"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **4.3.1 Iterando coleções** — for-each, `Iterator`, e por que
  modificar uma coleção durante iteração dá erro.
- [ ] **4.3.2 `Comparable` e `Comparator`** — ordenação natural vs
  customizada, `Collections.sort`, referências a métodos.

## Module 5 — Tratamento de exceções e I/O básico

Java tem um sistema de exceções mais rígido (checked exceptions) do que a
maioria das linguagens que o aluno provavelmente já usou. Este módulo cobre
isso e as operações de I/O mais comuns.

### 5.1 Exceções

```topic-meta
id: "5.1"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **5.1.1 `try`/`catch`/`finally`** — sintaxe, ordem de execução,
  múltiplos `catch`.
- [ ] **5.1.2 Checked vs unchecked exceptions** — a distinção própria de
  Java, `throws` na assinatura de métodos, quando cada tipo é apropriado.
- [ ] **5.1.3 Criando exceções customizadas** — estendendo `Exception` ou
  `RuntimeException`, boas práticas de mensagens de erro.

### 5.2 I/O e recursos

```topic-meta
id: "5.2"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **5.2.1 `try-with-resources`** — gerenciamento automático de recursos,
  interface `AutoCloseable`.
- [ ] **5.2.2 Leitura e escrita básica de arquivos** — `Files`, `Path`,
  leitura de texto simples, o suficiente para exercícios práticos.

## Module 6 — Programação funcional em Java

Java moderno (8+) incorporou lambdas e a Stream API. É um estilo diferente
do imperativo puro e costuma ser a maior curva de aprendizado para quem
chega de outras linguagens — mesmo quem já conhece o conceito de função de
alta ordem precisa ver a sintaxe e as interfaces funcionais específicas de
Java.

### 6.1 Lambdas e interfaces funcionais

```topic-meta
id: "6.1"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **6.1.1 Sintaxe de lambda em Java** — `(args) -> expressão`, inferência
  de tipos, comparação com classes anônimas.
- [ ] **6.1.2 Interfaces funcionais principais** — `Function`, `Predicate`,
  `Consumer`, `Supplier`, `@FunctionalInterface`.
- [ ] **6.1.3 Method references** — `Classe::metodo`, quando substituem
  lambdas com vantagem.

### 6.2 Stream API

```topic-meta
id: "6.2"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **6.2.1 Criando e operando streams** — `stream()`, operações
  intermediárias (`filter`, `map`) vs terminais (`collect`, `forEach`,
  `reduce`).
- [ ] **6.2.2 Coletando resultados com `Collectors`** — `toList`, `toMap`,
  `groupingBy`, casos de uso comuns.
- [ ] **6.2.3 Streams vs loops tradicionais** — quando cada abordagem é mais
  legível/apropriada, armadilhas de performance e efeitos colaterais.

### 6.3 `Optional`

```topic-meta
id: "6.3"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **6.3.1 O problema que `Optional` resolve** — evitar
  `NullPointerException`, expressar ausência de valor de forma explícita.
- [ ] **6.3.2 Usando `Optional` corretamente** — `map`, `orElse`,
  `ifPresent`, e o antipadrão de abusar de `Optional.get()`.

## Module 7 — Concorrência básica e features modernas

Fechando o curso com uma introdução a threads (essencial para entender
qualquer aplicação Java real) e os recursos mais recentes da linguagem que
tornam o código mais conciso e seguro.

### 7.1 Threads básicas

```topic-meta
id: "7.1"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **7.1.1 Criando e rodando threads** — `Thread`, `Runnable`, o método
  `start()` vs `run()`.
- [ ] **7.1.2 Condições de corrida e `synchronized`** — o problema básico de
  concorrência e a primeira ferramenta de Java para lidar com ele
  (introdução, não aprofundamento em concorrência avançada).

### 7.2 Features modernas da linguagem

```topic-meta
id: "7.2"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **7.2.1 Inferência de tipo local com `var`** — quando usar, quando
  evitar por legibilidade.
- [ ] **7.2.2 `record`** — classes de dados imutáveis, o que o compilador
  gera automaticamente, comparação com uma classe tradicional equivalente.
- [ ] **7.2.3 `switch` expressions e pattern matching básico** — a evolução
  do `switch` tradicional, sintaxe de seta, pattern matching para
  `instanceof`.
