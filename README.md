# Sistema de Gerenciamento de Catálogo de Produtos

Este repositório contém uma arquitetura distribuída e assíncrona desenvolvida para o processamento de catálogos de produtos com alta vazão e tolerância a falhas. O ecossistema dissocia o recebimento de requisições HTTP da execução de tarefas pesadas de rede (enriquecimento de dados de terceiros) utilizando mensageria baseada em filas controladas.

---

## 1. Instruções para Execução e Testes (Ambiente Local)

Siga os passos abaixo para inicializar o ecossistema completo na sua máquina.

### Pré-requisitos

- Docker e Docker Compose instalados.

### Passo 1: Configuração das Variáveis de Ambiente

Crie um ficheiro chamado **`.env`** na raiz do projeto (no mesmo nível deste arquivo README). Copie e cole o seguinte bloco padrão dentro do seu ficheiro `.env` para garantir a inicialização de todos os serviços conteinerizados:

```env
# Configurações do PostgreSQL (Infraestrutura)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secretpassword
POSTGRES_DB=catalog_management

# Configurações do Redis (Infraestrutura)
REDIS_PASSWORD=redissecuredpassword

# Configurações de Conexão do Backend (API e Worker)
NODE_ENV=development
PORT=3333
DATABASE_URL=postgres://postgres:secretpassword@postgres:5432/catalog_management
REDIS_URL=redis://redis:6379
FAKE_STORE_API_URL=https://fakestoreapi.com

# Configurações de Comunicação do Frontend
FRONTEND_URL=http://localhost:3000
VITE_API_URL=http://localhost:3333

```

### Isolamento do Ambiente de Testes (.env.test)

- **Função do .env.test:** O projeto possui o ficheiro `.env.test` pré-configurado na raiz para isolar a execução dos testes automatizados de integração e concorrência. Ele força a suíte a apontar para uma base de dados e cache paralelos. Isso garante que os comandos de limpeza executados pelo Jest antes de cada teste não apaguem ou corrompam os dados salvos no seu ambiente de desenvolvimento local.

### Passo 2: Inicialização da Aplicação (Modo Desenvolvimento)

Para construir as imagens e inicializar os containers limpando resquícios de volumes antigos, execute o comando abaixo no terminal da raiz do projeto:

```bash
docker compose down -v && docker compose up --build

```

_Nota: Este comando iniciará 5 serviços locais: Banco de Dados PostgreSQL, Cache/Fila Redis, API HTTP Node.js, Worker de Segundo Plano BullMQ e a SPA Frontend em React (Vite). Os scripts de inicialização do banco rodarão as migrações estruturais e índices de performance de forma totalmente automatizada._

### Passo 3: Verificação de Acesso

Assim que os logs do terminal estabilizarem, as interfaces estarão disponíveis em:

- **Interface do Usuário (React SPA):** `http://localhost:3000`
- **API Rest Endpoints:** `http://localhost:3333`

### Passo 4: Execução da Suíte de Testes Automatizados

Os testes de integração e concorrência rodam com base nas configurações isoladas do `.env.test`. Para executá-los:

1. Abra um novo terminal na pasta **`backend/`**.
2. Execute o comando:

```bash
npm run test

```

### Passo 5: Execução em Imagem Otimizada (Modo Produção/AWS Ready)

Caso queira testar o comportamento do sistema simulando um deploy de produção (onde o TypeScript é compilado para JavaScript nativo dentro de `dist/`, dependências de desenvolvimento são omitidas e o frontend compilado é servido via Nginx na porta 80), execute:

```bash
docker compose down -v && docker compose -f docker-compose.prod.yml up --build

```

_Nota: A interface web neste modo passará a ser servida diretamente na porta HTTP padrão:_ `http://localhost`.

---

## 2. Perguntas de Raciocínio Técnico

### Integração Resiliente

**Pergunta:** Como você desenharia uma integração com uma API externa que possui limites de requisição (rate limiting) e instabilidade ocasional para garantir que seu sistema continue funcional?

**Resposta:** Eu desenharia essa integração separando o sistema principal da API externa através de uma fila de mensagens e um padrão de mensageria assíncrona. Em vez de fazer requisições síncronas, o sistema publica os dados na fila, liberando a aplicação para continuar rodando. Para o rate limiting, os workers consomem essa fila em um ritmo controlado (usando o algoritmo Token Bucket, por exemplo), monitorando os cabeçalhos HTTP de limite da API para desacelerar quando necessário. Para a instabilidade, implementaria um Circuit Breaker para cortar as chamadas se os erros persistirem, evitando travar o sistema. As falhas pontuais seriam tratadas com Retry com Exponential Backoff e Jitter (tentativas espaçadas). Como plano de contingência (fallback), o sistema serviria dados armazenados em cache ou processaria a tarefa em background, garantindo resiliência total.

### Refinamento de Requisito

**Pergunta:** Ao receber uma demanda vaga da área de negócio, quais etapas você segue para transformá-la em uma especificação técnica pronta para desenvolvimento?

**Resposta:** Para transformar uma demanda vaga em uma especificação técnica pronta, eu sigo um processo de refinamento focado em extrair o valor real do negócio e blindar o escopo. Primeiro, faço uma reunião de alinhamento com a área de negócio para entender a dor que querem resolver (o "porquê") e o resultado esperado, traduzindo a ideia para o formato de User Stories (Quem, O quê e Para quê). En seguida, defino claramente o escopo estipulando os Critérios de Aceite (o que a functionalidade deve fazer) e, o mais importante, o que está fora do escopo para evitar o aumento do projeto no meio do caminho. Depois, passo para a análise técnica: mapeio os impactos na arquitetura atual, desenho as mudanças no banco de dados e modulo as novas APIs ou contratos de integração. Por fim, divido essa especificação em tarefas menores, claras e pontuadas (tasks), adicionando cenários de testes e diagramas de fluxo se necessário. A entrega é um documento pronto onde o desenvolvedor sabe exatamente o que codificar e como testar, sem margem para suposições.

### Idempotência

**Pergunta:** Em uma API de pagamentos ou pedidos, como você evita que o processamento seja duplicado em caso de retentativas do cliente?

**Resposta:** Para evitar o processamento duplicado, eu implementaria uma estratégia baseada em Chave de Idempotência. O cliente gera um identificador único (como um UUID) para a transação e o envia no cabeçalho da requisição. Ao receber o pedido, o sistema verifica em um cache rápido (como o Redis) se essa chave já existe; se não existir, ela é gravada temporariamente com o status "em processamento" para travar novas tentativas simultâneas. O pagamento é então processado no banco de dados e o resultado final é salvo no Redis atrelado àquela chave. Se o cliente perder a conexão e retransmitir a mesma requisição com a mesma chave, o sistema intercepta a chamada, busca o resultado já gravado no cache e o devolve imediatamente, garantindo que o dinheiro ou o pedido nunca sejam cobrados duas vezes.

### Síncrono vs. Assíncrono

**Pergunta:** Quais critérios definem se um fluxo deve ser resolvido imediatamente na requisição HTTP ou processado em segundo plano (fila)?

**Resposta:** Os critérios principais para definir entre síncrono e assíncrono são o tempo de execução, a dependência do usuário e a resiliência do sistema. Um fluxo deve ser síncrono (resolvido na hora) quando o cliente precisa da resposta imediata para continuar sua ação, o processo é leve e leva milissegundos, como em uma validação de login, busca de endereço por CEP ou checagem de saldo. Já o processamento deve ser assíncrono (via fila) quando a tarefa demora mais de um ou dois segundos e não impede a navegação imediata do usuário. Exemplos claros disso são a geração de relatórios pesados, envio de e-mails em lote, processamento de imagens e integrações com APIs externas instáveis. Ao jogar essas tarefas demoradas ou imprevisíveis para o segundo plano, liberamos a requisição HTTP rapidamente, o que evita o travamento dos servidores e melhora drasticamente a experiência do usuário.

### Segurança

**Pergunta:** Quais controles mínimos de segurança você aplica em uma API exposta publicamente?

**Resposta:** Para proteger uma API exposta publicamente, eu aplico controles mínimos focados em autenticação, integridade e proteção de recursos. Primeiro, exijo criptografia em trânsito usando TLS/HTTPS e implemento autenticação robusta via OAuth2 ou JWT, garantindo que apenas usuários validados acessem os recursos. Para mitigar ataques de negação de serviço (DoS) e abusos automatizados, configuro Rate Limiting direto no API Gateway. Toda informação recebida passa por uma validação rigorosa de payload para impedir ataques de injeção (como SQL Injection). Por fim, aplico o princípio do menor privilégio através de Controle de Acesso Baseado em Funções (RBAC), escondo detalhes da infraestrutura tratando mensagens de erro genéricas e mantenho auditoria e logs estruturados para monitorar comportamentos suspeitos em tempo real.

### Qualidade e Entrega

**Pergunta:** Como você decide o que é essencial para uma primeira versão (MVP) e o que deve ser tratado como débito técnico ou melhoria futuro?

**Resposta:** Para definir o escopo de um MVP, eu aplico o critério do valor mínimo para o negócio e para o usuário: se a funcionalidade for removida e o produto perder o seu propósito principal ou deixar de resolver a dor central do cliente, ela é essencial. Todo o restante, como automações complexas, otimizações extremas de performance e recursos secundários, é jogado para o backlog de melhorias. O que vira débito técnico consciente são as escolhas de arquitetura feitas para acelerar a entrega, como usar uma infraestrutura mais simples e monolítica ou implementar um processo manual nos bastidores (o famoso "fazer fumaça") para validar a demanda antes de construir um sistema automatizado robusto. O limite dessa linha é a segurança e a integridade dos dados, que nunca devem ser negligenciadas; se o atalho colocar em risco as informações do cliente ou inviabilizar a evolução futura do código, ele deixa de ser débito técnico aceitável e se torna um erro de engenharia.

### Governança e IA

**Pergunta:** Como utilizar IA para acelerar o desenvolvimento sem comprometer a segurança dos dados e a qualidade do código a longo prazo?

**Resposta:** Para acelerar o desenvolvimento com IA de forma segura, a estratégia é tratar o assistente como um copiloto técnico, nunca como o tomador de decisão. Em relação à segurança dos dados, o controle mínimo é a governança de privacidade: deve-se proibir o uso de chaves de API, senhas ou dados reais de clientes nos prompts, utilizando apenas ferramentas corporativas com contratos que garantam que o código gerado não será usado para treinar modelos públicos. Para a qualidade a longo prazo, o segredo é a revisão rigorosa: o código gerado pela IA deve passar obrigatoriamente por testes automatizados e code review humano. A IA é excelente para criar códigos de infraestrutura, testes unitários e algoritmos isolados, mas falha no contexto da arquitetura global e regras de negócio complexas. Ao documentar as decisões e proibir o "copiar e colar" cego, evitamos o endividamento técnico estrutural e mantemos o sistema sustentável.

---

## 3. Decisões Técnicas e Trade-offs Realizados

- **Desacoplamento Arquitetural (API vs. Worker):** O core da aplicação foi cindido em duas instâncias isoladas. Quando um produto é ingerido, a API executa validações de contrato síncronas via Zod, persiste o registro local com o status temporário `PROCESSING` e retorna `HTTP 202 Accepted` em poucos milissegundos. O processamento pesado de rede fica delegeado ao `EnrichmentWorker.ts` operando sob o BullMQ/Redis em background. O trade-off envolve a necessidade de pooling por parte da interface visual, porém garante imunidade da API contra travamentos por estouro de conexões síncronas.
- **Consistência Relacional Atômica na Ingestão:** Toda a lógica de inserção do produto básico e amarração de chaves estrangeiras na tabela `product_categories` foi encapsulada dentro de uma transação explícita do Knex (`db.transaction`). Isso assegura que, caso ocorra qualquer falha de barramento ou persistência no meio da requisição, o banco execute o _rollback_ imediato. Evita-se, assim, a existência de registros órfãos ou inconsistentes na base de dados.
- **Armazenamento Híbrido (Relacional + JSONB):** Para acomodar propriedades flexíveis e dinâmicas de metadados externos sem a adoção de esquemas complexos e custosos como EAV (_Entity-Attribute-Value_), optou-se pela utilização de colunas do tipo `JSONB` nativas do PostgreSQL. Relacionamentos fortes que exigem integridade relacional estrita (como vínculo de categorias) mantêm o uso de tabelas clássicas e chaves estrangeiras.
- **Mutações JSONB Atômicas em Query Única:** Para eliminar vulnerabilidades de condição de corrida (_Race Conditions_) entre o usuário enviando um `PATCH` e o Worker salvando dados em segundo plano, removeu-se completamente a necessidade de queries de `SELECT` prévias para a memória da aplicação. O controlador executa um `UPDATE` injetando o operador nativo de concatenação e merge do Postgres (`attributes || ?::jsonb`), garantindo isolamento thread-safe em nível de engine ACID.
- **Short Polling Frontend Controlado:** O frontend foi projetado com um temporizador cíclico reativo de 3 segundos para sincronizar as mudanças de status da fila assíncrona. No entanto, introduziu-se um curto-circuito condicional via `.some()` que verifica se existem registros no estado `PROCESSING` em exibição. Se a listagem estiver estável, o `setInterval` não é alocado, eliminando requisições repetitivas inúteis contra o backend.

---

## 4. Plano de Evolução Arquitetural (Cenário de 1 Milhão de Acessos)

Sob cenários de hiperescala e tráfego massivo em tempo real, as seguintes alterações estruturais seriam priorizadas:

1. **Migração de Polling para Server-Sent Events (SSE):** O modelo de short polling HTTP geraria milhões de conexões concorrentes desnecessárias. A API passaria a notificar os navegadores disparando eventos orientados por tópicos via Redis Pub/Sub apenas no instante exato da conclusão do Job pelo Worker.
2. **Implementação de CQRS com Elasticsearch/Meilisearch:** A busca avançada textual e a filtragem complexa de dados NoSQL seriam totalmente desvinculadas das tabelas transacionais do PostgreSQL. Os produtos passariam a ser indexados e consumidos a partir de um motor de busca distribuído dedicado (**Elasticsearch**), mantendo o banco relacional exclusivo para inserções e atualizações rápidas.
3. **Topologia de Réplicas de Leitura (Read Replicas):** O banco de dados PostgreSQL seria particionado e configurado para atuar com uma instância primária focada nas escritas estruturais e transações da fila, delegando toda a listagem de catálogos e consultas da API para múltiplos nós de réplicas exclusivas de leitura (_Read Replicas_).
4. **Observabilidade e Logs Estruturados em JSON:** Remoção completa de logs genéricos de console, adotando uma biblioteca de alta performance (como o **Pino.js**) para canalizar logs padronizados em JSON estruturado, integrando de ponta a ponta o rastreio do Circuit Breaker e tempos de resposta com ferramentas de monitoramento de APM (Datadog ou stack Prometheus/Grafana).

---

## 5. Cobertura de Testes e Qualidade de Software

- **Garantia de Fluxos Críticos de Negócio:** A suíte contém testes integrados que simulam alta concorrência simultânea para chaves de Idempotência, validações de isolamento de contratos DTO, comportamento sob falhas simuladas de serviços externos via `nock` e barramento preventivo de vazão por Rate Limiting.
- **Pipeline Automatizado Executável (CI/CD):** Integração contínua configurada via **GitHub Actions**. O fluxo baixa o repositório, levanta containers efêmeros e isolados de PostgreSQL e Redis no ambiente do runner do GitHub, executa checagem de tipos restrita do TypeScript (`tsc --noEmit`) e roda toda a bateria de testes integrados a cada push ou pull request aberto nas branches principais.
