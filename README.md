Projeto PsiDados

1. Conceito Geral do Projeto

O PsiDados é uma plataforma de prontuário digital inteligente desenhada para servir como uma ponte entre psicólogos e os seus pacientes.

O objetivo principal é coletar dados estruturados dos pacientes (através de questionários científicos) e resumos semanais, para que o psicólogo possa usar esses dados — potenciados por uma análise de IA (Gemini) — para otimizar o tratamento e obter insights valiosos.

O sistema é dividido em três fluxos principais:

Fluxo 1: O Psicólogo (O Gestor)

Este é o lado profissional da plataforma.

Autenticação: O psicólogo faz login com email, senha e crp.

Gestão de Pacientes: O psicólogo pode criar, ler, atualizar e apagar (CRUD) os seus pacientes.

Geração de Acesso: Ao criar um paciente, o sistema gera um codigo_acesso único (ex: "EXLT5N").

Configuração do Plano: Esta é a funcionalidade-chave. Para cada paciente, o psicólogo define um plano de acompanhamento:

Escolha do Questionário: O psicólogo escolhe 1 de 3 questionários científicos pré-definidos (identificados no backend como: "questionario1", "questionario2", "questionario3").

Definição da Frequência: O psicólogo define uma frequência de exatamente 3 dias por semana (ex: ["segunda", "quarta", "sexta"]) em que o paciente deve responder.

Fluxo 2: O Paciente (O Coletor de Dados)

Este é o lado simples e focado do paciente, que acede através de um portal ou app separado.

Login Simples: O paciente não tem uma conta complexa. Ele faz o login usando apenas o codigo_acesso (ex: "EXLT5N") que o psicólogo lhe forneceu.

Rotina Diária: Nos 3 dias definidos pelo psicólogo, a plataforma apresenta o questionário do dia (GET /api/questionario/hoje). O paciente submete as suas respostas, que são guardadas na tabela respostas_diarias.

Rotina Semanal: No final da semana, o paciente é solicitado a escrever um texto_resumo (sobre a semana que passou) e as suas expectativas (texto_expectativa), que são guardados na Tabela 5: resumos_semanais.

Fluxo 3: A IA (O Insight)

Esta é a funcionalidade central que torna o "PsiDados" especial e justifica o seu nome.

Análise Automática: Quando o paciente envia o seu resumo semanal (Tabela 5), o seu servidor não se limita a guardá-lo.

Ele automaticamente envia esse resumo para a API do Gemini (Google).

A IA (Gemini) lê o texto do paciente e gera uma análise (de sentimento, temas recorrentes, etc.), que é guardada na coluna analise_ia.

Valor para o Psicólogo: O psicólogo, ao preparar-se para a sessão, acede ao perfil do paciente e vê não só as respostas diárias, mas também um resumo e uma análise inteligente da semana do paciente, o que lhe poupa tempo e lhe dá insights valiosos.

2. Estrutura de Pastas do Projeto

A arquitetura do projeto segue um modelo monorepo com uma separação clara entre client (frontend) e server (backend).

📁 Psidados/  (Pasta Raiz)
│
├── 📁 client/
│   │   (Frontend: React, Vue, Angular, etc.)
│   ├── 📁 public/
│   └── 📁 src/
│
├── 📁 node_modules/
│   │   (Dependências do Node.js, instaladas via `npm install` na raiz)
│
├── 📁 server/  (Onde vive toda a API de backend)
│   │
│   ├── 📁 config/
│   │   │   └── 📄 db.js         (A sua conexão real com o Aiven, usando 'pg')
│   │
│   ├── 📁 controllers/
│   │   │   ├── 📄 authController.js        (Login/Registro do Psicólogo)
│   │   │   ├── 📄 pacienteController.js    (CRUD de Pacientes)
│   │   │   ├── 📄 pacienteAuthController.js (Login do Paciente)
│   │   │   └── 📄 questionarioController.js (Definir/Buscar/Responder Questionários)
│   │
│   ├── 📁 db/
│   │   │   └── 📄 schema.sql      (O "mapa" de referência do banco de dados)
│   │
│   ├── 📁 middleware/
│   │   │   ├── 📄 authMiddleware.js        (Segurança para rotas do Psicólogo)
│   │   │   └── 📄 pacienteAuthMiddleware.js (Segurança para rotas do Paciente)
│   │
│   ├── 📁 routes/
│   │   │   ├── 📄 authRoutes.js            (Rotas /api/auth/*)
│   │   │   ├── 📄 pacienteRoutes.js        (Rotas /api/pacientes/*)
│   │   │   ├── 📄 pacienteAuthRoutes.js    (Rotas /api/paciente-auth/*)
│   │   │   └── 📄 questionarioRoutes.js    (Rotas /api/questionario/*)
│   │
│   ├── 📄 .env              (Ficheiro de segredos: Senhas do DB, JWT_SECRET)
│   └── 📄 server.js         (Arquivo principal que inicia o Express)
│
├── 📄 .gitignore
├── 📄 package.json      (O ficheiro principal do projeto, com os scripts 'dev' e 'start')
└── 📄 package-lock.json


3. Estado Atual & Próximos Passos Técnicos

O projeto tem a autenticação e o CRUD do psicólogo funcionais, bem como a configuração e busca de questionários.

O Próximo Desafio Técnico (Importante):
O schema.sql (na Tabela 4: respostas_diarias) foi desenhado originalmente com colunas fixas (nota_humor, reflexao_texto). Isto só funciona para o questionário "questionario3" (diário simples).

Para suportar as respostas dos questionários "questionario1" e "questionario2" (que são arrays de números, ex: [0, 1, 2, 0, 3]), a Tabela 4 precisa ser alterada.

Próximo Passo Sugerido:
Executar o seguinte SQL no banco de dados Aiven para tornar a tabela de respostas flexível:

-- Remover as colunas antigas e específicas
ALTER TABLE respostas_diarias DROP COLUMN IF EXISTS nota_humor;
ALTER TABLE respostas_diarias DROP COLUMN IF EXISTS reflexao_texto;

-- Adicionar a nova coluna genérica
ALTER TABLE respostas_diarias ADD COLUMN IF NOT EXISTS respostas JSONB;


Após esta alteração, o próximo passo de código é implementar a rota POST /api/questionario/responder.