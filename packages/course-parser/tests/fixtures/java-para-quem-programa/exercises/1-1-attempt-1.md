---
course: "java-para-quem-programa"
topic: "1.1"
attempt: 1
date: 2026-08-31
score: "5/7"
result: mixed
weak_points: ["invoca `java` com a extensão `.class`", "papel do JIT na execução do bytecode"]
---

# Attempt 1 — 1.1 JVM, JDK e o modelo de execução

## Item-by-item

### 1. Diferença entre JVM, JRE e JDK
**User's answer:** JVM executa o bytecode, JRE é a JVM mais as bibliotecas
padrão, JDK é o JRE mais as ferramentas de desenvolvimento. Para desenvolver
instala-se o JDK.
**Verdict:** correct
**Feedback:** Resposta completa e precisa, incluindo a hierarquia entre os
três.
**Reference answer:** JVM = máquina virtual que executa bytecode; JRE = JVM +
bibliotecas padrão para rodar programas; JDK = JRE + `javac`, debugger e
outras ferramentas. Para desenvolver, instala-se o JDK.

### 2. "Write once, run anywhere"
**User's answer:** O `.java` viaja e cada máquina compila de novo.
**Verdict:** incorrect
**Feedback:** O que viaja é o `.class` (bytecode), não o código-fonte. A
portabilidade vem de cada plataforma ter sua própria JVM capaz de executar o
mesmo bytecode sem recompilação.
**Reference answer:** O `.class` viaja; a JVM de cada plataforma interpreta e
compila (JIT) o mesmo bytecode.

### 3. Comandos para compilar e executar
**User's answer:** `javac Calculator.java` e depois `java Calculator`.
**Verdict:** correct
**Feedback:** Ordem e sintaxe corretas.
**Reference answer:** `javac Calculator.java` seguido de `java Calculator`.

### 4. Erro ao rodar `java Calculator.class`
**User's answer:** Dá erro porque o arquivo não existe.
**Verdict:** partially correct
**Feedback:** O arquivo existe — o problema é que o comando `java` espera o
nome da *classe*, não do arquivo. Com a extensão, a JVM procura uma classe
chamada `Calculator.class` (pacote `Calculator`, classe `class`), que não
existe.
**Reference answer:** `java` recebe o nome da classe; o comando correto é
`java Calculator`.

### 5. Conteúdo do `.class` em editor de texto
**User's answer:** Esperado, é binário.
**Verdict:** correct
**Feedback:** Correto — bytecode é uma representação binária de instruções da
JVM, não texto.
**Reference answer:** Esperado: o `.class` contém bytecode binário.

### 6. Papel do Maven/Gradle
**User's answer:** Gerenciam dependências externas e automatizam o build
(compilar, testar, empacotar em `.jar`).
**Verdict:** correct
**Feedback:** Cobre os dois pontos centrais: dependências e automação do ciclo.
**Reference answer:** Resolver e baixar dependências, compilar na ordem certa
e empacotar em `.jar`.

### 7. Portabilidade do bytecode vs código nativo
**User's answer:** Porque a JVM interpreta o bytecode em qualquer máquina. Em
C o binário só roda no processador para o qual foi compilado.
**Verdict:** partially correct
**Feedback:** A ideia central está certa, mas faltou mencionar que a JVM não
apenas interpreta: o JIT compila os trechos quentes para código nativo *da
máquina em que está rodando*, o que é justamente o que torna a portabilidade
viável sem sacrificar desempenho.
**Reference answer:** O bytecode é neutro em relação à plataforma; cada JVM o
traduz (interpretação + JIT) para o código nativo local. Um binário C já é
código nativo de uma arquitetura específica.

## Summary

Pontos fortes: ferramental (`javac`/`java`, JDK/JRE/JVM, build tools).
Pontos fracos: o que exatamente é portátil (bytecode vs fonte) e o papel do JIT.
