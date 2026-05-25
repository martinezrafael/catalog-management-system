# Catálogo de Produtos com Mensageria Assíncrona 🚀

[cite_start]Este projeto é a implementação do **Cenário 3 (Catálogo de Itens)** para a Avaliação Sênior[cite: 22, 25]. [cite_start]Criei uma arquitetura distribuída para separar o recebimento de requisições HTTP do processamento pesado em background[cite: 29, 30]. [cite_start]O sistema utiliza armazenamento híbrido (Relacional + NoSQL) no PostgreSQL, controle de concorrência com BullMQ/Redis e resiliência com Circuit Breaker[cite: 30].

---

## 🛠️ 1. Como Executar (Docker)

[cite_start]Toda a infraestrutura sobe de forma automatizada com um único comando[cite: 38]. [cite_start]O ambiente orquestra 5 serviços: PostgreSQL, Redis, a API em Node.js, o Worker de background e o Frontend em React[cite: 28, 33, 39].

### Passo a passo:

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/martinezrafael/catalog-management-system.git](https://github.com/martinezrafael/catalog-management-system.git)
   cd catalog-management-system
   ```

````

2. **Suba todo o ecossistema:**
   O comando abaixo garante a limpeza de volumes antigos e reconstrói as imagens locais com as variáveis necessárias:

```bash
docker compose down -v && docker compose up --build

```

3. **Portas de acesso local:**

- **Interface Web (React SPA):** [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000)

- **API REST (Node.js/Express):** [http://localhost:3333](https://www.google.com/search?q=http://localhost:3333)

---

## 🧠 2. Perguntas Técnicas

Respostas objetivas limitadas ao teto de 10 linhas da avaliação.

### Q1: Integração Resiliente

**Pergunta:** Como você desenharia uma integração com uma API externa que possui limites de requisição (rate limiting) e instabilidade ocasional para garantir que seu sistema continue funcional?

**Resposta:** Eu isolaria a chamada externa usando uma fila assíncrona. Em vez de travar a requisição do usuário, o sistema joga a tarefa em background. Para respeitar o rate limiting, configuraria o Worker para consumir as mensagens em um ritmo controlado (usando a lógica de Token Bucket), monitorando os cabeçalhos de limite da própria API. Em caso de instabilidade, implementaria um Circuit Breaker para interromper temporariamente novas chamadas após uma taxa cumulativa de erros, evitando desperdício de recursos. Falhas momentâneas seriam tratadas com tentativas automáticas usando recuo exponencial e ruído estatístico (Jitter). Como plano de contingência, o sistema entregaria dados em cache ou usaria um payload estruturado de fallback.

### Q2: Refinamento de Requisito

**Pergunta:** Ao receber uma demanda vaga da área de negócio, quais etapas você segue para transformá-la em uma especificação técnica pronta para desenvolvimento?

**Resposta:** O processo começa conversando diretamente com os stakeholders para entender a dor real do negócio e o objetivo final da entrega, traduzindo o cenário para User Stories focadas no usuário. Em seguida, delimito o escopo: escrevo de forma explícita os Critérios de Aceite e o que está fora do projeto para evitar que o escopo aumente no meio do desenvolvimento. Com a regra de negócio blindada, faço o desenho técnico: impactos na infraestrutura, modelagem do banco de dados e os contratos de payload das APIs. Por fim, quebro o escopo em tarefas menores, claras e pontuadas por complexidade relativa. O resultado é um documento onde qualquer desenvolvedor consegue codificar e testar sem precisar assumir regras por conta própria.

### Q3: Idempotência

**Pergunta:** Em uma API de pagamentos ou pedidos, como você evita que o processamento seja duplicado em caso de retentativas do cliente?

**Resposta:** Utilizaria uma estratégia baseada em Chave de Idempotência. O cliente gera um identificador único universal (UUID) e o envia no cabeçalho HTTP da requisição. Assim que a API recebe a chamada, ela checa em um cache rápido e atômico (como o Redis) se aquela chave já está ativa. Se for o primeiro acesso, o Redis grava a chave com o status "em processamento" e um tempo de expiração curto (TTL), servindo como uma trava pessimista para barrar cliques duplos simultâneos. O backend processa a operação no banco de dados e salva o resultado final no cache atrelado à chave. Caso o cliente sofra uma queda de rede e retransmita o mesmo UUID, o sistema intercepta a chamada, lê o resultado direto do Redis e o devolve imediatamente, impedindo cobranças ou duplicidades.

### Q4: Síncrono vs. Assíncrono

**Pergunta:** Quais critérios definem se um fluxo deve ser resolvido imediatamente na requisição HTTP ou processado em segundo plano (fila)?

**Resposta:** Os fatores determinantes são o tempo estimado de execução, a necessidade imediata da resposta para a navegação do usuário e a estabilidade da infraestrutura. O fluxo deve ser síncrono quando o processo é leve (leva milissegundos) e o usuário precisa do retorno para avançar na tela — como uma validação de credenciais, checagem de saldo ou busca de endereço por CEP. O fluxo deve ser assíncrono e delegado a uma fila quando envolve tarefas demoradas (acima de 1 a 2 segundos) ou que dependem de fatores externos instáveis. Exemplos claros são a geração de relatórios massivos, envio de e-mails em lote, processamento de mídias e conexões com APIs de terceiros. Isso libera a requisição HTTP em milissegundos e evita o travamento dos servidores.

### Q5: Segurança

**Pergunta:** Quais controles mínimos de segurança você aplica em uma API exposta publicamente?

**Resposta:** O ponto de partida é forçar criptografia em trânsito com TLS/HTTPS e implementar autenticação e autorização robustas usando JWT ou OAuth2. Na borda do sistema, configuro um Rate Limiting no API Gateway para mitigar ataques de força bruta e negação de serviço (DoS). Todo e qualquer payload recebido passa por validações rígidas de esquema (com Zod ou ferramentas similares) para neutralizar tentativas de injeção de código, como SQL Injection. Para o controle de acessos internos, aplico o princípio do menor privilégio com RBAC (controle baseado em funções). Por fim, configuro o tratamento global de erros para nunca exibir stack traces ou detalhes da infraestrutura ao cliente, mantendo logs estruturados e monitoramento ativo em ambiente fechado.

### Q6: Qualidade e Entrega

**Pergunta:** Como você decide o que é essencial para uma primeira versão (MVP) e o que deve ser tratado como débito técnico ou melhoria futura?

**Resposta:** O critério de corte é o valor essencial para validar a hipótese de negócio: se a remoção de uma funcionalidade descaracterizar o produto ou impedir o usuário de resolver o problema central, ela entra no escopo do MVP. Todo o restante — como integrações avançadas, automações de processos secundários e otimizações de performance prematuras — vira backlog. O débito técnico entra em cena de forma consciente quando opto por soluções mais simples ou arquiteturas menos robustas para acelerar o aprendizado de mercado (ex: rodar um processo manual simulando um sistema automatizado). A linha vermelha que nunca deve ser cruzada é a segurança, a conformidade jurídica e a integridade dos dados dos usuários; se o atalho trouxer riscos nesses pilares, não é débito técnico, é falha de engenharia.

### Q7: Governança e IA

**Pergunta:** Como utilizar IA para acelerar o desenvolvimento sem comprometer a segurança dos dados e a qualidade do código a longo prazo?

**Resposta:** O segredo está em tratar as ferramentas de IA estritamente como copilotos de desenvolvimento, delegando a responsabilidade final da engenharia ao olhar humano. No aspecto da segurança, a governança padrão proíbe o envio de credenciais, chaves privadas, regras core de negócio ou dados reais de clientes nos prompts, utilizando licenças corporativas onde os contratos garantem que o código enviado não treinará modelos públicos. Para manter a qualidade a longo prazo, adoto uma postura defensiva: nenhum trecho gerado é incorporado sem passar por Code Review humano minucioso e validação em baterias de testes automatizados. A IA acelera de forma excepcional a escrita de códigos repetitivos, estruturas de testes e algoritmos isolados, mas falha no desenho da arquitetura global.

---

## 📐 3. Decisões Técnicas e Trade-offs

- **Arquitetura Isolada (API vs. Worker):** Separei o core do sistema em duas aplicações independentes. Quando um produto é cadastrado, a API valida a estrutura com o Zod, salva no banco com o status provisório `PROCESSING` e responde `202 Accepted` imediatamente ao usuário. O trabalho pesado de rede e enriquecimento fica com o Worker assíncrono rodando em background através do BullMQ. O trade-off é que a interface precisa buscar atualizações por amostragem, mas o ganho em estabilidade e vazão da API compensa esse esforço.

- **Banco de Dados Híbrido (Relacional + JSONB):** Para atender o requisito de modelagem flexível, usei o PostgreSQL. Tabelas que exigem integridade rígida (como o relacionamento e vínculo de Categorias) utilizam o modelo relacional estrito com chaves estrangeiras. Já os atributos dinâmicos e o retorno do enriquecimento da API externa são armazenados em uma coluna do tipo `JSONB` na tabela de produtos. Isso me permitiu flexibilizar as propriedades por categoria sem adotar estruturas complexas de ler como EAV (_Entity-Attribute-Value_) e sem precisar rodar migrações a cada novo atributo criado.

- **Disjuntor de Circuito contra Instabilidade (Opossum):** O Worker faz as chamadas para a _Fake Store API_ encapsulado por um Circuit Breaker. Se a API externa falhar consecutivamente ou bater no limite de requisições, o disjuntor abre instantaneamente. Em vez de derrubar a fila ou travar o Worker, o sistema injeta um payload de fallback padrão (`"Não informado"`, `"Geral"`, `price: 0`), atualiza o produto como `PROCESSED` e mantém o fluxo estável.

- **UX Sem F5 (Short Polling Reativo):** Para refletir as mudanças de status da fila na interface em tempo real sem exigir atualização manual do navegador, configurei um mecanismo de Short Polling reativo no React SPA. Quando a tabela renderiza algum item no estado `PROCESSING`, o frontend abre um loop de checagem automática a cada 3 segundos na API. Assim que o Worker conclui o job em segundo plano, a linha atualiza visualmente para a badge estável `PROCESSED` e o loop de requisições é desmontado da memória automaticamente.

---

## 📈 4. Cenário de Escala: O que faria com 1 Milhão de Acessos?

Se o sistema precisasse escalar para suportar 1 milhão de acessos, eu aplicaria as seguintes mudanças de infraestrutura e arquitetura:

1. **Substituição do Polling por Server-Sent Events (SSE):** Fazer requisições HTTP a cada 3 segundos com milhões de usuários ativos destruiria a performance do backend. Eu mudaria o fluxo para **Server-Sent Events (SSE)**. Sendo um canal unidirecional leve e persistente, a API notificaria o navegador sobre o fim do enriquecimento do produto apenas quando o evento correspondente fosse disparado no Redis Pub/Sub, economizando conexões no servidor.
2. **Separação de Leitura e Escrita (CQRS):** Isolaria a infraestrutura de gravação de produtos da rota pública de listagem e buscas avançadas. Toda a parte de pesquisa textual e filtros avançados passaria a rodar em cima de uma base indexada no **Elasticsearch** ou **Meilisearch**, deixando o banco PostgreSQL focado apenas nas escritas pesadas e mutações geradas pelos Workers.

3. **Camada de Cache Distribuído (Redis Cluster):** Implementaria uma estratégia de cache de leitura (_Read-through_) robusta nas rotas de busca de catálogo. As consultas dos clientes seriam resolvidas diretamente na memória do Redis Cluster, sem onerar o banco de dados. A invalidação dessas chaves de cache seria disparada de forma cirúrgica pelo próprio Worker apenas no momento exato em que ele terminasse de processar um item.

4. **Réplicas de Leitura e Auto-scaling de Workers:** Configuraria o banco de dados com uma topologia de escrita (_Primary_) e múltiplas instâncias de réplicas exclusivas para leitura (_Read Replicas_). Além disso, o Worker do BullMQ seria isolado em pods independentes configurados com auto-scaling baseado na volumetria de mensagens acumuladas na fila do Redis, escalando a capacidade de processamento de forma elástica sob picos de tráfego.

---

## 📺 5. Entrega e Qualidade Técnica

- **Maturidade e Clean Code:** Código escrito de forma desacoplada, utilizando injeção de dependências nativa, padronização estrita de tratamento de erros e encapsulamento dos componentes de infraestrutura (Knex, Redis e Opossum).

- **Camada de Testes:** O projeto conta com testes automatizados integrados para validar a consistência das rotas e regras críticas de negócio, como a eficácia da chave de idempotência e os validadores de DTO.

- **Filtros e UX:** A busca e os filtros avançados (termo textual, seletor dinâmico de categorias, status da fila e propriedades NoSQL do campo JSONB) operam de forma integrada, fluida e reativa na interface do usuário.

```

```
````
