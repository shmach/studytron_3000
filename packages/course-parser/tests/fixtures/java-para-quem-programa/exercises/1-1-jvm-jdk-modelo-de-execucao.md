---
course: "java-para-quem-programa"
topic: "1.1"
generated: 2026-08-30
difficulty_target: 2
---

# Exercises — 1.1 JVM, JDK e o modelo de execução

## Warm-up

1. Explique com suas palavras a diferença entre JVM, JRE e JDK. Qual dos
   três você instala quando quer *desenvolver* programas Java?
2. Por que se diz que Java é "write once, run anywhere"? O que exatamente
   viaja de uma plataforma para outra — o `.java` ou o `.class`?

## Core

3. Você tem um arquivo `Calculator.java` com uma classe pública chamada
   `Calculator` e um método `main`. Escreva, na ordem certa, os dois
   comandos de linha de comando necessários para compilar e depois
   executar esse programa.

4. Um colega roda `java Calculator.class` (com a extensão `.class` no
   comando) e recebe um erro. Explique por que isso acontece e qual é o
   comando correto.

5. Depois de compilar `Calculator.java`, você abre o arquivo `.class`
   gerado em um editor de texto comum e vê um monte de caracteres sem
   sentido. Isso é esperado ou indica que algo deu errado? Justifique.

6. Descreva, em 2-3 frases, o papel que uma ferramenta como Maven ou
   Gradle assume que `javac`/`java` sozinhos não resolvem, quando o
   projeto passa a ter várias dependências externas.

## Challenge

7. (combina com 1.1.1 e 1.1.2) Um programa Java compilado uma única vez
   consegue rodar sem recompilar em uma máquina Windows e em uma máquina
   Linux, desde que ambas tenham uma JVM instalada. Explique, em termos do
   que acontece com o bytecode em cada máquina, por que isso é possível —
   e por que isso não seria possível se `javac` gerasse código de máquina
   nativo diretamente (como acontece em C, por exemplo).
