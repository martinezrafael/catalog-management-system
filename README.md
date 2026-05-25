# Sistema de Gerenciamento de Catálogo de Produtos

Este repositório contém uma arquitetura distribuída e assíncrona voltada para o processamento de catálogos de produtos com alta vazão e tolerância a falhas. O ecossistema dissocia o recebimento de requisições HTTP da execução de tarefas pesadas de rede (enriquecimento de dados) utilizando mensageria baseada em filas controladas.

---

## 1. Gestão e Configuração de Ambientes (.env)

O sistema adota uma estratégia de segregação de configurações baseada no padrão de doze fatores (12-Factor App). A aplicação é totalmente controlada por três escopos de arquivos de ambiente distintos:

- **`.env.example` (Gabarito Estrutural):** Arquivo público monitorado pelo Git que serve de modelo para a inicialização do projeto. Ele lista todas as chaves obrigatórias exigidas pela validação de esquema do Zod, sem expor credenciais reais ou senhas de produção.
- **`.env.test` (Isolamento de Testes):** Arquivo público com as configurações estritas e conexões exclusivas voltadas para a suíte de testes de integração e concorrência. Ele garante que a execução do Jest opere em bancos de dados e caches efêmeros, impedindo que as limpezas de tabelas feitas pelos testes apaguem os dados gerados no seu ambiente de desenvolvimento.
- **`.env` (Execução Runtime Local):** Arquivo privado e ignorado pelo Git (`.gitignore`) que deve ser criado manualmente na raiz do projeto antes da inicialização. Ele define as credenciais locais que serão injetadas diretamente nos contêineres do Docker Compose.

### Passo 1: Criação do arquivo `.env` local

Para rodar os contêineres localmente, crie o arquivo **`.env`** na raiz do repositório utilizando o conteúdo abaixo como definição padrão para o funcionamento do ambiente:

```env
# ==============================================================================
# CONFIGURAÇÕES DA INFRAESTRUTURA (Lidas diretamente pelo docker-compose.yml)
# ==============================================================================
POSTGRES_USER=admin
POSTGRES_PASSWORD=secretpassword
POSTGRES_DB=catalog_management

REDIS_PASSWORD=redissecuredpassword

# ==============================================================================
# CONFIGURAÇÕES DO BACKEND (Injetadas nos containers da API e do Worker)
# ==============================================================================
NODE_ENV=production
PORT=3333

DATABASE_URL=postgres://admin:secretpassword@postgres:5432/catalog_management
REDIS_URL=redis://redis:6379
FAKE_STORE_API_URL=https://fakestoreapi.com

# URL do frontend permitida pelo CORS do Backend
# Desenvolvimento Local (docker-compose.yml): http://localhost:3000
# Produção Local (docker-compose.prod.yml): http://localhost
FRONTEND_URL=http://localhost

# ==============================================================================
# CONFIGURAÇÕES DO FRONTEND
# ==============================================================================
VITE_API_URL=http://localhost:3333

```

### Passo 2: Inicialização da Aplicação (Modo Desenvolvimento)

Se desejar executar a aplicação com sincronização de volumes locais e recarregamento automático (hot-reloading), execute na raiz do repositório:

```bash
docker compose down -v && docker compose up --build

```

_Portas de acesso:_ Frontend em `http://localhost:3000` | API Rest em `http://localhost:3333`.

### Passo 3: Inicialização Otimizada (Modo Produção / AWS Ready)

Para rodar a aplicação simulando o comportamento de nuvem (TypeScript compilado para JavaScript puro dentro da pasta `dist`, dependências de desenvolvimento omitidas e frontend servido de forma estática via Nginx na porta 80), utilize:

```bash
docker compose down -v && docker compose -f docker-compose.prod.yml up --build

```

_Portas de acesso:_ Frontend em `http://localhost` | API Rest em `http://localhost:3333`.

### Passo 4: Execução da Suíte de Testes Automatizados

O comando de testes ignora o arquivo `.env` e carrega exclusivamente o arquivo `.env.test` para preservar as bases. Para rodar a cobertura:

1. Navegue até a pasta do backend: `cd backend`
2. Execute o script: `npm run test`

---

## 2. Perguntas de Raciocínio Técnico

### Integração Resiliente

**Pergunta:** Como você desenharia uma integração com uma API externa que possui limites de requisição (rate limiting) e instabilidade ocasional para garantir que seu sistema continue funcional?

**Resposta:** Eu desenharia essa integração separando o sistema principal da API externa através de uma fila de mensagens e um padrão de mensageria assíncrona. Em vez de fazer requisições síncronas, o sistema publica os dados na fila, liberando a aplicação para continuar rodando. Para o rate limiting, os workers consomem essa fila em um ritmo controlado (usando o algoritmo Token Bucket, por exemplo), monitorando os cabeçalhos HTTP de limite da API para desacelerar quando necessário. Para a instabilidade, implementaria um Circuit Breaker para cortar as chamadas se os erros persistirem, evitando travar o sistema. As falhas pontuais seriam tratadas com Retry com Exponential Backoff e Jitter (tentativas espaçadas). Como plano de contingência (fallback), o sistema serviria dados armazenados em cache ou processaria a tarefa em background, garantindo resiliência total.

### Refinamento de Requisito

**Pergunta:** Ao receber uma demanda vaga da área de negócio, quais etapas você segue para transformá-la em uma especificação técnica pronta para desenvolvimento?

**Resposta:** Para transformar uma demanda vaga em uma especificação técnica pronta, eu sigo um processo de refinamento focado em extrair o valor real do negócio e blindar o escopo. Primeiro, faço uma reunião focado no alinhamento com a área de negócio para entender a dor que querem resolver (o "porquê") e o resultado esperado, traduzindo a ideia para o formato de User Stories (Quem, O quê e Para quê). Em seguida, defino claramente o escopo estipulando os Critérios de Aceite (o que a funcionalidade deve fazer) e, o mais importante, o que está fora do escopo para evitar o aumento do projeto no meio do caminho. Depois, passo para a análise técnica: mapeio os impactos na arquitetura atual, desenho as mudanças no banco de dados e modulo as novas APIs ou contratos de integração. Por fim, divido essa especificação em tarefas menores, claras e pontuadas (tasks), adicionando cenários de testes e diagramas de fluxo se necessário. A entrega é um documento pronto onde o desenvolvedor sabe exatamente o que codificar e como testar, sem margem para suposições.

### Idempotência

**Pergunta:** Em uma API de pagamentos ou pedidos, como você evita que o processamento seja duplicado em caso de retentativas do cliente?

**Resposta:** Para evitar o processamento duplicado, eu implementaria uma estratégia baseada em Chave de Idempotência. O cliente gera um identificador único (como um UUID) para a transação e o envia no cabeçalho da requisição. Ao receber o pedido, o sistema verifica em um cache rápido (como o Redis) se essa chave já existe; se não existir, ela é gravada temporariamente com o status "em processamento" para travar novas tentativas simultâneas. O pagamento é então processado no banco de dados e o resultado final é salvo no Redis atrelado àquela chave. Se o cliente perder a conexão e retransmitir a mesma requisição com a mesma chave, o sistema intercepta a chamada, busca o resultado já gravado no cache e o devolve imediatamente, garantindo que o dinheiro ou o pedido nunca sejam cobrados duas vezes.

### Síncrono vs. Assíncrono

**Pergunta:** Quais critérios definem se um fluxo deve ser resolvido imediatamente na requisição HTTP ou processado em segundo plano (fila)?

**Resposta:** Os critérios principais para definir entre síncrono e assíncrono são o tempo de execução, a dependência do usuário e a resiliência do sistema. Um fluxo deve ser síncrono (resolvido na hora) quando o cliente precisa da resposta imediata para continuar sua ação, o processo é leve e leva milissegundos, como em uma validação de login, busca de endereço por CEP ou checagem de saldo. Já o processamento deve ser assíncrono (via fila) quando a tarefa demora mais de um ou dois segundos e não impede a navegação imediata do usuário. Exemplos claros disso são a geração de relatórios pesados, envio de e-mails em lote, processamento de imagens e integrações com APIs externas instáveis. Ao jogar essas tarefas demoradas ou imprevisíveis para o segundo plano, liberamos a requisição HTTP rapidamente, o que evita o travamento dos servidores e melhora drasticamente a experiência do usuário.

### Segurança

**Pergunta:** Quais controles mínimos de segurança você aplica em uma API exposta publicamente?

**Resposta:** Para proteger uma API exposta publicamente, eu aplico controles mínimos focados em autenticação, integridade e proteção de recursos. Primeiro, exijo criptografia em trânsito usando TLS/HTTPS e implemento autenticação robusta via OAuth2 ou JWT, garantindo que apenas usuários validados acessem os recursos. Para mitigar ataques de negação de serviço (DoS) e abusos automatizados, configuro Rate Limiting direto no API Gateway. Toda informação recebida passa por uma validação rigorosa de payload para impedir ataques de injeção (como SQL Injection). Por fim, aplico o princípio do menor privilégio através de Controle de Acesso Baseado em Funções (RBAC), escondo detalhes da infraestrutura tratando mensagens de erro genéricas e mantém auditoria e logs estruturados para monitorar comportamentos suspeitos em tempo real.

### Qualidade e Entrega

**Pergunta:** Como você decide o que é essencial para uma primeira versão (MVP) e o que deve ser tratado como débito técnico ou melhoria futura?

**Resposta:** Para definir o escopo de um MVP, eu aplico o critério do valor mínimo para o negócio e para o usuário: se a funcionalidade for removida e o produto perder o seu propósito principal ou deixar de resolver a dor central do cliente, ela é essencial. Todo o restante, como automações complexas, otimizações extremas de performance e recursos secundários, é jogado para o backlog de melhorias. O que vira débito técnico consciente são as escolhas de arquitetura feitas para acelerar a entrega, como usar uma infraestrutura mais simples e monolítica ou implementar um processo manual nos bastidores (o famoso "fazer fumaça") para validar a demanda antes de construir um sistema automatizado robusto. O limite dessa linha é a segurança e a integridade dos dados, que nunca devem ser negligenciadas; se o atalho colocar em risco as informações do cliente ou inviabilizar a evolução futura do código, ele deixa de ser débito técnico aceitável e se torna um erro de engenharia.

### Governança e IA

**Pergunta:** Como utilizar IA para acelerar o desenvolvimento sem comprometer a segurança dos dados e a qualidade do código a longo prazo?

**Resposta:** Para acelerar o desenvolvimento com IA de forma segura, a estratégia é tratar o assistente como um copiloto técnico, nunca como o tomador de decisão. Em relação à segurança dos dados, o controle mínimo é a governança de privacidade: deve-se proibir o uso de chaves de API, senhas ou dados reais de clientes nos prompts, utilizando apenas ferramentas corporativas com contratos que garantam que o código gerado não será usado para treinar modelos públicos. Para a qualidade a longo prazo, o segredo é a revisão rigorosa: o código gerado pela IA deve passar obrigatoriamente por testes automatizados e code review humano. A IA é excelente para criar códigos de infraestrutura, testes unitários e algoritmos isolados, mas falha no contexto da arquitetura global e regras de negócio complexas. Ao documentar as decisões e proibir o "copiar e colar" cego, evitamos o endividamento técnico estrutural e mantemos o sistema sustentável.

---

## 3. Decisões Técnicas e Trade-offs Realizados

- **Desacoplamento de Contexto (API vs. Worker):** O núcleo do sistema é cindido em duas instâncias de execução isoladas. No momento de ingestão do produto, a API executa validações rápidas de contrato, persiste o registro básico com o status temporário `PROCESSING` e responde imediatamente com `HTTP 202 Accepted`. O processamento pesado de rede fica delegado ao worker em segundo plano utilizando o ecossistema BullMQ/Redis. O trade-off envolve a necessidade de pooling na interface visual, mas blinda a API contra exaustão de conexões HTTP.
- **Transações Relacionais ACID na Ingestão:** Toda a lógica de inserção inicial do produto e vinculação com suas categorias associadas está centralizada sob o escopo de uma transação transacional gerenciada pelo Knex (`db.transaction`). Caso ocorra qualquer instabilidade de barramento ou erro na inserção relacional múltipla, o PostgreSQL executa o _rollback_ imediato, impedindo produtos com dados incompletos ou órfãos na base.
- **Armazenamento Híbrido Relacional + NoSQL (JSONB):** A modelagem adota tabelas e chaves estrangeiras rígidas para elementos estruturais estáveis (vínculo de categorias). Propriedades flexíveis, metadados dinâmicos e payloads resultantes do enriquecimento externo são alocados em campos binários NoSQL (`JSONB`) na tabela de produtos. O trade-off elimina a complexidade estrutural de modelagens EAV (_Entity-Attribute-Value_) e evita migrações custosas a cada nova propriedade adicionada.
- **Mutações JSONB Atômicas em Query Única:** Para anular brechas de condições de corrida (_Race Conditions_) entre ações concomitantes do usuário via `PATCH` e a finalização assíncrona do Worker, o controlador executa atualizações atômicas diretamente na query SQL usando o operador nativo de concatenação e fusão do Postgres (`attributes || ?::jsonb`). Isso dispensa um `SELECT` prévio e assegura consistência em nível de engine.
- **Short Polling Frontend Otimizado:** O frontend atualiza as informações consultando o servidor a cada 3 segundos. Contudo, o ciclo do temporizador é condicional e reativo: ele analisa o estado atual da tela usando `.some()` e aloca o loop apenas enquanto houver registros no status provisório `PROCESSING`. Quando os produtos chegam ao estado final, o loop é interrompido automaticamente, poupando requisições na API.

---

## 4. Plano de Evolução Arquitetural (Cenário de 1 Milhão de Acessos)

Caso o ecossistema mude para um cenário corporativo de altíssima escala, as seguintes atualizações seriam priorizadas:

1. **Substituição de Polling por Server-Sent Events (SSE):** Manter loops HTTP contra a API para milhões de usuários geraria overhead desnecessário nos servidores. Adotaríamos conexões persistentes via streams unidirecionais de **SSE**. A API passaria a empurrar as notificações reativas de atualização aos navegadores em tempo real, disparadas por canais de Pub/Sub do Redis assim que o Worker concluísse a tarefa.
2. **Arquitetura de CQRS com Elasticsearch/Meilisearch:** Desvincular as pesquisas textuais, filtros de categorias e buscas avançadas do banco de dados relacional. Os dados de produtos estáveis seriam espelhados de forma automática em um motor de busca distribuído focado em leitura rápida (**Elasticsearch**), mantendo o PostgreSQL otimizado puramente para transações de escritas e mutações.
3. **Topologia de Banco com Réplicas de Leitura:** O banco de dados relacional seria configurado com um nó principal isolado para escritas (_Primary Instance_) e um cluster de múltiplas réplicas assíncronas assinaladas exclusivamente para a leitura de catálogos (_Read Replicas_), distribuindo o tráfego de busca de forma balanceada.
4. **Observabilidade e Telemetria Estruturada:** Substituição de logs textuais de console pelo uso de um formatador estruturado em formato JSON (como o **Pino.js**). Isso permitiria canalizar e centralizar os rastreios do Circuit Breaker, logs de erro e taxas de vazão diretamente para coletores de métricas APM (como Datadog ou stack Prometheus/Grafana).

---

## 5. Cobertura de Testes e Qualidade de Software

- **Garantia de Fluxos Críticos:** A suíte contém testes integrados cobrindo concorrência simultânea para chaves de Idempotência, validações de isolamento de contratos DTO via Zod, comportamento sob falhas de serviços externos via mocks do `nock` e barramento preventivo de vazão por Rate Limiting.
- **Garantia de Pipeline Verde (CI/CD):** Integração contínua configurada via **GitHub Actions**. O fluxo baixa o repositório, instala dependências, valida a tipagem estrita do TypeScript (`tsc --noEmit`) e levanta contêineres efêmeros e isolados de PostgreSQL e Redis no runner para rodar todos os testes automatizados a cada push ou pull request aberto nas branches principais.
