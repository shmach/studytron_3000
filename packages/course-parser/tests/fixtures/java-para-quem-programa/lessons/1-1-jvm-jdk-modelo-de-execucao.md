---
course: "java-para-quem-programa"
topic: "1.1"
title: "JVM, JDK e o modelo de execução"
generated: 2026-08-30
covers: ["1.1.1", "1.1.2", "1.1.3"]
---

# 1.1 — JVM, JDK e o modelo de execução

## Where we are

Esta é a primeira aula do curso. Você já sabe programar — então em vez de
reexplicar o que é uma variável ou um laço, vamos direto para o que é
*específico de Java*: como o código que você escreve vira um programa que
roda de verdade. Entender isso primeiro evita que o resto do curso pareça
mágica.

## 1.1.1 O que é a JVM e por que Java compila para bytecode

Nas linguagens que você já usou, provavelmente aconteceu uma de duas
coisas: ou o código era interpretado direto (Python, JavaScript), ou era
compilado direto para código de máquina nativo do seu processador (C, Go).
Java faz uma terceira coisa, e é essa diferença que explica quase tudo sobre
como o ecossistema é organizado.

Quando você compila um arquivo `.java`, o compilador (`javac`) não gera
código de máquina para o seu processador. Ele gera **bytecode** — um
arquivo `.class` com instruções para uma máquina virtual, não para o seu
CPU. Quem executa esse bytecode é a **JVM** (Java Virtual Machine), um
programa que sabe interpretar (e, com o tempo, compilar sob demanda —
JIT, *just-in-time*) essas instruções para o processador real em que está
rodando.

A vantagem disso é a famosa frase "write once, run anywhere": o mesmo
arquivo `.class` roda sem recompilar em Windows, Linux ou Mac, desde que
exista uma JVM para aquela plataforma. É um pouco como comparar com uma
máquina virtual de verdade (VirtualBox, Docker): o "hardware" que a JVM
oferece ao seu programa é sempre o mesmo, não importa o hardware real por
baixo.

Isso também explica por que Java tem uma reputação de ser "mais lento para
começar, mais rápido depois": a JVM gasta um tempo no início interpretando
bytecode, mas o compilador JIT identifica os trechos de código mais usados
(*hot paths*) e os compila para código de máquina nativo em tempo de
execução, otimizando com base no comportamento real do programa.

## 1.1.2 Compilando e executando pela linha de comando

Antes de usar qualquer IDE, vale a pena fazer isso uma vez na mão para
entender o que a IDE está automatizando para você.

Crie um arquivo `Hello.java`:

```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, JVM!");
    }
}
```

Compile com o `javac` (parte do JDK — veremos a diferença JDK/JRE/JVM já
já):

```bash
javac Hello.java
```

Isso gera um arquivo `Hello.class` — o bytecode de que falamos acima. Você
pode até abri-lo em um editor de texto: vai ver bytes praticamente
ilegíveis, porque não é texto, é a representação binária das instruções da
JVM.

Para rodar, você não chama `javac` de novo — você chama a JVM diretamente,
pedindo para ela carregar e executar aquela classe:

```bash
java Hello
```

Note que você passa `Hello`, sem `.class` — o comando `java` já sabe
procurar o arquivo `Hello.class` correspondente. A saída deve ser:

```
Hello, JVM!
```

Esse ciclo — `javac` compila para bytecode, `java` invoca a JVM para
executar esse bytecode — é o coração de qualquer processo de build Java,
não importa quão sofisticada a ferramenta por cima seja.

Agora que separamos os dois passos, vale nomear as três siglas que
costumam confundir:

- **JVM** (*Java Virtual Machine*): a máquina virtual que executa
  bytecode. É o que descrevemos acima.
- **JRE** (*Java Runtime Environment*): a JVM mais as bibliotecas padrão
  necessárias para *rodar* programas Java já compilados. Se você só
  precisa executar um `.jar` de terceiros, o JRE bastaria.
- **JDK** (*Java Development Kit*): o JRE mais as ferramentas para
  *desenvolver* Java — o `javac` que você acabou de usar, debugger,
  gerador de documentação, etc. É o que você instala para programar.

Hoje em dia praticamente todo mundo instala o JDK direto (o JRE isolado
caiu em desuso), mas é bom saber a diferença porque a documentação e as
mensagens de erro ainda usam esses três termos com precisão.

## 1.1.3 Panorama das ferramentas de build (Maven/Gradle)

Compilar e rodar um arquivo isolado com `javac`/`java` funciona para um
"Hello, World", mas um projeto real tem dezenas ou centenas de arquivos,
depende de bibliotecas de terceiros, e precisa ser empacotado de forma
distribuível. É para isso que existem ferramentas de build.

As duas mais usadas no ecossistema Java são:

- **Maven**: configuração declarativa em um arquivo XML (`pom.xml`),
  onde você lista as dependências do projeto e a ferramenta cuida de
  baixá-las, compilar tudo na ordem certa e empacotar o resultado.
- **Gradle**: um sistema mais flexível, com um arquivo de configuração em
  Groovy ou Kotlin (`build.gradle` / `build.gradle.kts`), que também
  resolve dependências e automatiza o build, mas permite scripts mais
  programáticos.

Por trás de ambos, o que acontece é conceitualmente o mesmo processo que
você acabou de fazer manualmente: eles chamam o compilador Java, resolvem
onde estão as bibliotecas externas necessárias (baixando-as de
repositórios como o Maven Central) e organizam a saída em um `.jar`
(*Java Archive* — um `.zip` com seus arquivos `.class` dentro).

Não vamos configurar um projeto Maven/Gradle do zero ainda — isso fica
para quando tivermos dependências de verdade para gerenciar, mais à
frente no curso. Por ora, o importante é saber que essas ferramentas
existem, o problema que resolvem (gerenciar dependências e automatizar o
ciclo compilar → testar → empacotar) e reconhecer os arquivos `pom.xml`
ou `build.gradle` quando você encontrar um projeto Java em qualquer lugar.

## Key takeaways

- Java compila para **bytecode** (`.class`), não para código de máquina
  nativo; quem executa o bytecode é a **JVM**.
- O ciclo básico é `javac Arquivo.java` (compila) seguido de
  `java Arquivo` (executa, sem a extensão `.class`).
- **JDK** = ferramentas de desenvolvimento + **JRE** = JVM + bibliotecas
  para rodar programas já compilados + **JVM** = a máquina virtual em si.
  Hoje em dia, instala-se o JDK.
- Maven e Gradle automatizam compilação, gerenciamento de dependências e
  empacotamento (`.jar`) para projetos reais — não é preciso configurá-los
  ainda, só reconhecer o papel deles.

## What's next

A próxima aula (1.2) entra na estrutura de um programa Java propriamente
dito: classes, o método `main`, pacotes e as convenções de sintaxe da
linguagem.
