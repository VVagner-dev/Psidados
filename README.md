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

Configuração do Plano: Para cada paciente, o psicólogo define um plano de acompanhamento (escolha do questionário e frequência).

Leitura de Dados: O psicólogo pode aceder a rotas protegidas para ler o histórico de respostas diárias e os resumos semanais (com a análise de IA) de cada paciente.

Fluxo 2: O Paciente (O Coletor de Dados)

Este é o lado simples e focado do paciente, que acede através de um portal ou app separado.

Login Simples: O paciente faz o login usando apenas o codigo_acesso.

Rotina Diária: Nos dias definidos, o paciente responde ao questionário (respostas_diarias).

Rotina Semanal: No final da semana, o paciente escreve um resumo e uma expectativa (resumos_semanais).

Fluxo 3: A IA (O Insight)

Esta é a funcionalidade central que torna o "PsiDados" especial.

Análise Automática: Quando o paciente envia o seu resumo semanal (Tabela 5), o servidor envia esse resumo para a API do Gemini (Google).

Geração de Insight: A IA gera uma análise (de sentimento, temas recorrentes, etc.) e salva-a na coluna analise_ia.

Valor para o Psicólogo: O psicólogo acede ao perfil do paciente e vê não só as respostas, mas também a análise inteligente da IA.

2. Estrutura de Pastas do Projeto

📁 Psidados/
│
├── 📁 client/
│   │   (Frontend: React, Vue, Angular, etc.)
│   ├── 📁 public/
│   └── 📁 src/
│       └── 📄 App.jsx   (Ponto de entrada do React)
│
├── 📁 node_modules/
│
├── 📁 server/
│   │
│   ├── 📁 config/
│   │   │   └── 📄 db.js
│   │
│   ├── 📁 controllers/
│   │   │   ├── 📄 authController.js
│   │   │   ├── 📄 pacienteController.js
│   │   │   ├── 📄 pacienteAuthController.js
│   │   │   ├── 📄 questionarioController.js
│   │   │   └── 📄 resumoController.js
│   │
│   ├── 📁 db/
│   │   │   └── 📄 schema.sql
│   │
│   ├── 📁 middleware/
│   │   │   ├── 📄 authMiddleware.js
│   │   │   └── 📄 pacienteAuthMiddleware.js
│   │
│   ├── 📁 routes/
│   │   │   ├── 📄 authRoutes.js
│   │   │   ├── 📄 pacienteRoutes.js
│   │   │   ├── 📄 pacienteAuthRoutes.js
│   │   │   ├── 📄 questionarioRoutes.js
│   │   │   └── 📄 resumoRoutes.js
│   │
│   ├── 📄 .env
│   └── 📄 server.js
│
├── 📄 .gitignore
├── 📄 package.json
└── 📄 package-lock.json


3. Estado Atual & Próximos Passos

✅ Estado Atual: Backend Completo (API Pronta)

O backend (a API na pasta /server) está agora funcionalmente completo. Todos os três fluxos descritos acima estão implementados e a funcionar:

Psicólogo (Gestor):

POST /api/auth/registrar (Cria psicólogo)

POST /api/auth/login (Login do psicólogo)

POST /api/pacientes (Cria paciente)

GET /api/pacientes (Lista pacientes)

GET /api/pacientes/:id (Vê paciente específico)

PUT /api/pacientes/:id (Atualiza paciente)

DELETE /api/pacientes/:id (Deleta paciente)

POST /api/pacientes/:id/questionario (Define o plano)

GET /api/pacientes/:id/respostas-diarias (Lê respostas)

GET /api/pacientes/:id/resumos-semanais (Lê resumos e análise da IA)

Paciente (Coletor):

POST /api/paciente-auth/login (Login com codigo_acesso)

GET /api/questionario/hoje (Busca questionário do dia)

POST /api/questionario/responder (Envia respostas diárias)

POST /api/resumo/semanal (Envia resumo semanal)

IA (Insight):

A rota POST /api/resumo/semanal chama automaticamente a API do Gemini e guarda a analise_ia na base de dados.

🚀 Próximo Passo: Construir o Frontend (client/)

Agora que a API está pronta e a funcionar, o próximo passo é construir a interface do utilizador (o "rosto" da aplicação) na pasta client/.

Esta interface terá duas partes principais, que podem ser construídas em qualquer ordem, mas o fluxo do psicólogo é recomendado primeiro:

Portal do Psicólogo:

Uma página de Login (para POST /api/auth/login).

Um Dashboard (protegido) que lista os pacientes (de GET /api/pacientes).

Uma página de "Detalhes do Paciente" que mostra os dados de GET /api/pacientes/:id/respostas-diarias e GET /api/pacientes/:id/resumos-semanais.

Modais ou páginas para criar/editar pacientes e definir os seus questionários.

Portal do Paciente:

Uma página de Login simples que pede apenas o codigo_acesso (para POST /api/paciente-auth/login).

Uma página principal que mostra o questionário do dia (de GET /api/questionario/hoje).

Uma página para o resumo semanal (para POST /api/resumo/semanal).