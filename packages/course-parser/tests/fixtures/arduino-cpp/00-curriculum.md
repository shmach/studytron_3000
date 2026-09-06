---
course: "C++ na Prática com Arduino"
slug: "arduino-cpp"
created: 2026-09-06
depth: quick
level: beginner
goal: "Aprender C++ na prática construindo projetos reais com o kit Arduino Uno R3, prototipando ideias que depois migram para automação (ESP32/n8n)"
language: pt-BR
---

# C++ na Prática com Arduino

> Curso rápido de C++ usando o Arduino Uno R3 como plataforma de aprendizado.
> Cada tópico ensina um conceito da linguagem e termina em um projeto funcional
> montado com as peças do kit "Uno R3 Avançado" (protoboard, sensores, LCD I2C,
> motores, etc.). Ao final, o leitor terá C++ suficiente para prototipar
> qualquer sensor/atuador antes de migrar para um ESP32 conectado ao n8n.

## Module 1 — Fundamentos da linguagem e do hardware

Primeiro contato com C++ no contexto do Arduino: estrutura de um sketch, tipos
de dados e como o código controla pinos físicos. Base para tudo que vem depois.

### 1.1 Setup, loop e saída digital

```topic-meta
id: "1.1"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **1.1.1 Anatomia de um sketch (setup/loop)** — 2–3 lines: o que são as
  funções `setup()` e `loop()`, o ciclo de execução do microcontrolador
  comparado a um loop de evento que o leitor já conhece (Node/event loop).
- [ ] **1.1.2 Pinos digitais e `digitalWrite`** — como declarar `pinMode`,
  acender/apagar um LED, e a diferença entre HIGH/LOW como abstração de
  voltagem.
- [ ] **1.1.3 Projeto: Blink com LED e protoboard** — montar 1 LED + resistor
  na protoboard e piscar em intervalo controlado por `delay()`.

### 1.2 Variáveis, tipos e constantes

```topic-meta
id: "1.2"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **1.2.1 Tipagem estática em C++** — `int`, `float`, `bool`, `char`,
  contraste direto com a tipagem dinâmica de JS/Python que o leitor já usa.
- [ ] **1.2.2 `const` e `#define`** — por que fixar pinos e constantes evita
  bugs, diferença entre as duas formas.
- [ ] **1.2.3 Projeto: LED RGB controlado por variáveis** — usar 3 variáveis
  de intensidade (`int`) para misturar cores no LED RGB do kit via PWM.

### 1.3 Entrada digital

```topic-meta
id: "1.3"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **1.3.1 `digitalRead` e pull-up/pull-down** — como ler o estado de um
  botão de forma confiável, o problema do "float" elétrico.
- [ ] **1.3.2 Debounce em software** — por que um botão "solta" múltiplos
  eventos e como resolver isso com uma variável de estado + `delay` simples.
- [ ] **1.3.3 Projeto: Botão liga/desliga LED** — push button do kit
  alternando o estado de um LED a cada aperto (toggle).

## Module 2 — Controle de fluxo, funções e arrays

Estruturas de decisão e repetição, e como organizar código em funções
reutilizáveis — a base para qualquer lógica de automação real.

### 2.1 Condicionais

```topic-meta
id: "2.1"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **2.1.1 `if / else if / else`** — sintaxe e operadores relacionais/
  lógicos em C++.
- [ ] **2.1.2 `switch/case`** — quando preferir a `if/else` encadeado, exemplo
  com estados de um sistema.
- [ ] **2.1.3 Projeto: Semáforo com LEDs** — vermelho/amarelo/verde
  (LEDs do kit) ciclando por tempos diferentes, com lógica condicional
  controlando as transições.

### 2.2 Loops e arrays

```topic-meta
id: "2.2"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **2.2.1 `for` e `while`** — iteração em C++, cuidado com loops
  bloqueantes num microcontrolador de thread única.
- [ ] **2.2.2 Arrays estáticos** — declarar um array de pinos, percorrer com
  `for`, por que o tamanho é fixo em C++ (contraste com listas dinâmicas).
- [ ] **2.2.3 Projeto: Sequência "Knight Rider"** — array com os 5 LEDs
  vermelhos do kit acendendo em sequência de vai-e-vem.

### 2.3 Funções

```topic-meta
id: "2.3"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **2.3.1 Declarar e chamar funções** — parâmetros, retorno, `void`,
  por que organizar código em funções facilita reaproveitar em outros
  projetos (inclusive no futuro ESP32).
- [ ] **2.3.2 Escopo de variáveis** — global vs. local, pegadinha clássica de
  reaproveitar nome de variável dentro de uma função.
- [ ] **2.3.3 Projeto: Buzzer tocando uma melodia simples** — função
  `tocarNota(frequencia, duracao)` usando `tone()` no buzzer passivo,
  tocando uma sequência de notas definida em um array.

## Module 3 — Sensores e comunicação serial

Como ler o mundo real (analógico e digital) e conversar com o computador via
serial — a ponte que depois vira integração com o n8n.

### 3.1 Entrada analógica

```topic-meta
id: "3.1"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **3.1.1 `analogRead` e ADC** — como o Arduino converte voltagem em um
  número de 0–1023, o que isso significa fisicamente.
- [ ] **3.1.2 Mapeando valores com `map()`** — converter a leitura crua em
  uma unidade útil (ex: brilho, ângulo).
- [ ] **3.1.3 Projeto: Dimmer de LED com potenciômetro** — o potenciômetro
  10K controla o brilho de um LED via PWM, usando `map()`.

### 3.2 Sensores digitais e comunicação serial

```topic-meta
id: "3.2"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **3.2.1 `Serial.begin` e `Serial.print`** — como abrir o canal serial e
  depurar valores em tempo real; a mesma via que depois liga o Arduino a um
  script Python/Node no PC.
- [ ] **3.2.2 Bibliotecas de terceiros (DHT11)** — instalar/incluir uma lib
  externa, ler temperatura e umidade.
- [ ] **3.2.3 Projeto: Monitor de temperatura e umidade** — DHT11 lendo e
  imprimindo os valores no Monitor Serial a cada segundo.

### 3.3 Structs e lógica de decisão com sensores

```topic-meta
id: "3.3"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **3.3.1 Sensor ultrassônico (HC-SR04)** — como funciona a medição por
  tempo de eco, cálculo de distância em C++.
- [ ] **3.3.2 `struct` simples** — agrupar dados relacionados (ex: distância +
  timestamp) num tipo próprio, por que isso deixa o código mais legível.
- [ ] **3.3.3 Projeto: Alarme de distância/nível** — HC-SR04 (ou sensor de
  nível de água) disparando o buzzer e um LED quando um limite é ultrapassado.

## Module 4 — Atuadores e projeto final integrador

Controlar motores e displays, e fechar o curso com um projeto que combina
sensor + display + atuador — o padrão que reaparece em automações reais.

### 4.1 PWM e servo motor

```topic-meta
id: "4.1"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **4.1.1 PWM em profundidade** — o que o duty cycle representa,
  diferença entre `analogWrite` e o sinal de controle de um servo.
- [ ] **4.1.2 Biblioteca `Servo.h`** — `attach()`, `write()`, limites de
  ângulo.
- [ ] **4.1.3 Projeto: Controle de servo com joystick** — o módulo joystick
  do kit controla o ângulo do servo SG90 em tempo real.

### 4.2 Motor de passo

```topic-meta
id: "4.2"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **4.2.1 Motores de passo vs. servos** — diferença conceitual, por que
  precisa de um driver (ULN2003).
- [ ] **4.2.2 Biblioteca `Stepper.h`** — configurar passos por volta,
  controlar velocidade e direção.
- [ ] **4.2.3 Projeto: Cortina/persiana motorizada** — motor de passo +
  ULN2003 abrindo/fechando por acionamento de botão.

### 4.3 Display LCD I2C

```topic-meta
id: "4.3"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **4.3.1 Protocolo I2C na prática** — por que o módulo I2C economiza
  pinos, endereço do dispositivo, biblioteca `LiquidCrystal_I2C`.
- [ ] **4.3.2 Escrevendo texto e posicionamento no LCD1602** — `setCursor`,
  `print`, atualizar texto sem piscar a tela.
- [ ] **4.3.3 Projeto: Relógio/status no LCD** — Arduino recebe a hora via
  Serial (enviada por um script no PC) e exibe no LCD1602 — resolve na prática
  o problema da barra de tarefas oculta.

### 4.4 Projeto final integrador

```topic-meta
id: "4.4"
status: pending
perceived_difficulty:
weak_points: []
last_reviewed:
```

- [ ] **4.4.1 Combinando sensor + decisão + atuador + display** — desenhar a
  arquitetura de um mini-sistema completo em C++ (funções separadas para
  leitura, lógica e saída — o mesmo padrão que facilita migrar para ESP32/n8n
  depois).
- [ ] **4.4.2 Projeto: Estação de monitoramento com alerta** — DHT11 lê
  temperatura/umidade, LCD1602 mostra os valores em tempo real, e o relé
  aciona o módulo ventilador automaticamente se a temperatura passar de um
  limite definido.
