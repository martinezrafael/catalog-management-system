# 📦 Sistema de Gerenciamento de Catálogo de Produtos

[![Backend CI](https://github.com/martinezrafael/catalog-management-system/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/martinezrafael/catalog-management-system/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/martinezrafael/catalog-management-system/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/martinezrafael/catalog-management-system/actions/workflows/frontend-ci.yml)

Uma solução full-stack corporativa de alta vazão projetada sob uma **Arquitetura Orientada a Eventos (EDA)**. O principal pilar do sistema é o desacoplamento completo entre a ingestão síncrona de requisições HTTP e o ciclo pesado de processamento em segundo plano (I/O de rede e enriquecimento de dados através de APIs terceiras).

---

## 🏗️ 1. Visão Geral da Arquitetura

O ecossistema é composto por cinco camadas totalmente conteinerizadas e orquestradas em rede isolada:

```

┌─────────────────┐             ┌─────────────────┐             ┌─────────────────┐
│                 │  HTTP POST  │   Backend API   │  Persistência │                 │
│  Frontend SPA   ├────────────►│  (Porta 3333)   ├──────────────►│   PostgreSQL    │
│   (React 19)    │             │ (Node.js/Exp 5) │     ACID      │   (Status:      │
│                 │             └────────┬────────┘               │  PROCESSING)    │
└─────────────────┘                      │                        └─────────────────┘
│ Enfileirar
▼ Job
┌─────────────────┐
│  Fila BullMQ    │
│  (Over Redis)   │
└────────┬────────┘
│
│ Consome
▼ Task
┌─────────────────┐             ┌─────────────────┐
│  Background     │  Enriquecer │ Fake Store API  │
│     Worker      ├────────────►│   (API Rest     │
│ (Update status) │             │    Externa)     │
└─────────────────┘             └─────────────────┘

```

### Componentes Principais & Tecnologias

- **Frontend SPA:** Desenvolvido em **React 19**, **Vite**, **Tailwind CSS** e **Shadcn/UI**. Utiliza _Short Polling_ condicional e reativo para atualizar o grid de produtos sem sobrecarregar a infraestrutura.
- **API Gateway/Backend:** Construído em **Node.js (Express v5)** com **TypeScript** estrito. Gerencia validação de contratos em tempo de execução via **Zod**, regras de idempotência e escrita relacional transacional.
- **Background Worker:** Instância isolada do Node.js dedicada exclusivamente a consumir as tarefas gerenciadas pelo **BullMQ (Redis)**. Possui mecanismos acoplados de estabilidade (_Circuit Breaker_ via **Opossum** e políticas de _backoff_ exponencial).

---

## 🚀 2. Guia de Execução Local (Ponta a Ponta)

Siga os passos abaixo para clonar, configurar e rodar o projeto do absoluto zero em sua máquina.

### Pré-requisitos

- **Docker** instalado (versão 20.10+)
- **Docker Compose** (v2.0+)
- **Git**

### Passo 0: Clonar o Repositório

Abra o seu terminal e execute os comandos abaixo para baixar o projeto e acessar a pasta raiz:

```bash
# Clonar o repositório
git clone [https://github.com/martinezrafael/catalog-management-system.git](https://github.com/martinezrafael/catalog-management-system.git)

# Acessar a pasta raiz do projeto
cd catalog-management-system

```

### Passo 1: Configuração Ambiental (`.env`)

O projeto utiliza um arquivo centralizador de variáveis de ambiente localizado na raiz. Fornecemos um arquivo de exemplo pré-configurado. Basta duplicá-lo:

```bash
cp .env.example .env

```

### Passo 2: Inicialização em Modo Desenvolvimento

Para erguer a malha de serviços com espelhamento de volumes locais e _Hot-Reload_ (qualquer alteração no código será refletida instantaneamente nos containers):

```bash
docker compose down -v && docker compose up --build

```

Após a conclusão do build, as interfaces estarão disponíveis em:

- **Frontend (SPA):** `http://localhost:3000`
- **API Backend:** `http://localhost:3333/api/v1`

### Passo 3: Inicialização em Modo Produção (AWS Ready)

Para simular um ambiente produtivo otimizado (onde o código TypeScript é compilado nativamente para Javascript dentro de `/dist`, dependências de desenvolvimento são omitidas e o Front-end é servido de forma ultra-rápida via **Nginx** na porta padrão HTTP 80):

```bash
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml up --build

```

- **Frontend (Nginx Multi-stage):** `http://localhost`
- **API Backend:** `http://localhost:3333/api/v1`

---

## 🧪 3. Suíte de Testes Automatizados

Desenvolvemos uma estratégia rigorosa de testes de integração ponta a ponta focados em comportamentos críticos de concorrência e resiliência usando **Jest**.

### Executando os Testes

Para rodar os testes localmente usando uma base efêmera isolada (`.env.test`):

```bash
cd backend
npm install
npm run test

```

### Escopo de Cobertura Crítica

1. **`idempotency.spec.ts`:** Dispara requisições paralelas idênticas em frações de milissegundos para garantir que a trava no Redis bloqueie transações duplicadas de forma atômica.
2. **`rate-limit.spec.ts`:** Valida se o limitador de vazão acoplado no BullMQ retém de forma segura surtos de requests acima de 10 execuções por segundo.
3. **`worker.spec.ts`:** Utiliza a biblioteca `nock` para injetar instabilidades simuladas (HTTP 503) na API externa, validando o isolamento do Worker e o comportamento correto do circuito.

---

## 🛠️ 4. Decisões Técnicas & Mecanismos Sênior

### Camada de Idempotência Robusta

Para evitar processamento duplicado em cenários de instabilidade na rede do cliente, foi implementado um middleware Express conectado ao Redis.

- O cliente envia um UUID exclusivo sob o cabeçalho `Idempotency-Key`.
- A aplicação executa o comando atômico `SET NX` com TTL de 5 minutos.
- Requisições concorrentes idênticas que entram em paralelo recebem um `HTTP 409 Conflict`, enquanto requisições idênticas sequenciais recebem o resultado armazenado em cache.

### Padrão Circuit Breaker (Opossum)

O Worker de segundo plano comunica-se com a `FakeStoreAPI` (simulando um parceiro externo instável). Para blindar nossa infraestrutura contra desperdício de conexões e falhas em cascata:

- Configuramos um teto de timeout de 3 segundos por chamada.
- Caso o índice de falhas da API parceira ultrapasse 50% em uma janela amostral, o circuito **abre** por 10 segundos, rejeitando chamadas locais imediatamente sem onerar a rede.
- A fila possui política de **5 tentativas com Backoff Exponencial** iniciando em 2 segundos.

### Prevenção de Race Conditions no DB

Como o usuário pode alterar dados do produto via requisições HTTP normais (`PATCH`) simultaneamente ao período em que o Worker está processando o enriquecimento, eliminamos o risco de condições de corrida banindo o fluxo tradicional de `SELECT -> UPDATE` em memória. O Worker realiza **fusões atômicas nativas** no PostgreSQL manipulando a coluna `JSONB` via SQL direto (`attributes || ?::jsonb`), garantindo a consistência.

---

## 🧠 5. Raciocínio Técnico (Perguntas Abertas do Desafio)

#### 1. Integração Resiliente

Desenharia a integração utilizando uma arquitetura orientada a eventos (_Event-Driven_) com mensageria (BullMQ/Redis ou RabbitMQ). As chamadas seriam envelopadas por um componente de _Circuit Breaker_ (como o Opossum) para interromper requisições em caso de quedas persistentes do parceiro. Para respeitar os limites de _Rate Limiting_, configuraria um controle de concorrência direto nos consumidores da fila (_worker throttling_), limitando a vazão máxima de jobs por segundo e aplicando políticas de _Exponential Backoff_ com variação aleatória (_jitter_) para gerenciar as retentativas em caso de erro HTTP 429.

#### 2. Refinamento de Requisito

O processo seria dividido em quatro etapas estruturadas:

1. **Descoberta (Discovery):** Reunião com os stakeholders para entender a dor de negócio e o valor esperado (foco no impacto, não na solução técnica).
2. **Mapeamento de Restrições:** Definição de critérios de aceitação e regras de contorno (ex: volumetria esperada, criticidade, SLA).
3. **Modelagem e Contratos:** Desenho do fluxo de dados, diagramas de sequência e escrita dos contratos de API (Swagger/OpenAPI).
4. **Homologação:** Revisão técnica com o time para quebrar a demanda em tarefas técnicas granulares, prontas para o desenvolvimento (Definition of Ready).

#### 3. Idempotência

A estratégia ideal consiste em exigir uma chave de idempotência exclusiva (`Idempotency-Key` gerada como UUID pelo cliente) no cabeçalho das requisições de mutação. No backend, uma trava distribuída atômica (como o comando `SET key value NX PX` do Redis) é criada assim que a requisição é aceita. Se uma segunda chamada com a mesma chave entrar enquanto a primeira está processando, ela é rejeitada (ex: HTTP 409 ou aguarda). Se a primeira já tiver terminado, o resultado histórico salvo no cache é retornado imediatamente, bloqueando efeitos colaterais duplicados no banco de dados.

#### 4. Síncrono vs. Assíncrono

- **Critérios para Síncrono:** Operações que exigem resposta imediata para a tomada de decisão do usuário, possuem baixo tempo de execução física (I/O desprezível) e forte acoplamento de ciclo de vida (ex: autenticação de login, consulta de saldo em tempo real, validação cadastral simples).
- **Critérios para Assíncrono:** Operações pesadas que envolvem processamento intensivo de CPU ou I/O de rede lento (integração com APIs terceiras), tarefas volumosas em lote (batch), ou fluxos cujo resultado final não impede o usuário de continuar navegando (ex: geração de relatórios complexos, envio de e-mails, processamento de vídeos e ingestão/enriquecimento de catálogos).

#### 5. Monitoramento e Observabilidade

Para uma aplicação em produção sob alta concorrência, implementaria os três pilares da observabilidade de forma centralizada:

1. **Métricas:** Prometheus capturando telemetria de infraestrutura (CPU, Memória, IOPS) e métricas de aplicação (taxa de erro HTTP, latência p95/p99 e tamanho das filas do BullMQ), com dashboards no Grafana.
2. **Logs Estruturados:** Winston/Pino gerando logs em formato JSON, consolidados em uma pilha OpenSearch/ELK ou Grafana Loki para auditoria e rastreabilidade.
3. **Rastreamento Distribuído (Tracing):** OpenTelemetry integrado ao APM (Datadog ou Jaeger) para injetar IDs de correlação (`trace_id`) que acompanham a jornada de uma requisição desde o clique no Frontend, passando pela API, persistência, publicação em fila, até a execução final pelo Worker.

#### 6. Banco de Dados Relacional vs. Não-Relacional (NoSQL)

- **Vantagens do Relacional (PostgreSQL):** Garantia estrita de integridade referencial e transações ACID complexas, ideal para dados financeiros ou estruturados com forte relacionamento (como vínculos entre produtos e categorias), além de suporte maduro a queries analíticas e índices flexíveis.
- **Vantagens do NoSQL (MongoDB/Redis):** Escalabilidade horizontal simplificada (sharding), alta performance para operações simples de leitura/escrita de chave-valor e flexibilidade de esquema (schema-less), ideal para catálogos dinâmicos onde os produtos possuem atributos completamente heterogêneos.

#### 7. CI/CD (Integração e Entrega Contínuas)

O pipeline automatizado seria construído em ferramentas como GitHub Actions de forma modularizada:

1. **Etapa de CI (Garantia de Qualidade):** Disparado a cada _Pull Request_ para as ramificações principais. Executa linters (`ESLint`), checagem de tipos TypeScript (`tsc`), testes unitários e testes de integração end-to-end com bancos em containers docker efêmeros. O código só é elegível para merge se todas as verificações passarem.
2. **Etapa de CD (Entrega Segura):** Disparado após o merge na branch `main`. Realiza o build das imagens Docker otimizadas (multi-stage), publica as imagens em um registro privado (AWS ECR) e atualiza a infraestrutura de destino usando estratégias seguras de implantação como **Green-Blue Deployment** ou **Canary Releases** no Kubernetes (EKS), garantindo zero tempo de inatividade (_Zero Downtime_) e rollback automatizado em caso de anomalia nas métricas de saúde da aplicação.

---

## 📈 6. Visão de Escala (Cenário: 1 Milhão de Acessos)

Caso o sistema precise evoluir do patamar de MVP para suportar milhões de acessos concorrentes, as seguintes alterações seriam priorizadas:

1. **Server-Sent Events (SSE) ou WebSockets:** O mecanismo de _Short Polling_ atual (tabela batendo na API a cada 3 segundos) seria substituído por conexões unidirecionais persistentes (SSE). O Worker publicaria a conclusão do enriquecimento em canais Pub/Sub do Redis, notificando o navegador do usuário em tempo real e zerando o overhead de requests repetitivos de listagem.
2. **Segregação de Leitura e Escrita (CQRS):** Separaríamos completamente o fluxo de gravação do fluxo de consulta. As listagens e buscas avançadas seriam alimentadas por um motor NoSQL especializado em buscas textuais indexadas, como o **Elasticsearch** ou **OpenSearch**, desonerando o PostgreSQL de queries pesadas de filtragem.
3. **Réplicas de Leitura no DB:** Configuração de um cluster PostgreSQL contendo uma instância _Primary_ (exclusiva para escrita de transações ACID e manipulação do Worker) e múltiplas instâncias _Read Replicas_ distribuídas geograficamente atrás de um balanceador de carga para atender às consultas do catálogo.
