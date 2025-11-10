# 📊 PsiDados - Prontuário Digital Inteligente

## 🎯 Visão Geral

**PsiDados** é uma plataforma de prontuário digital inteligente que conecta psicólogos e pacientes através de dois portais especializados:

### 🧑‍⚕️ Portal do Psicólogo (Gestor)
- Autenticação com CRP
- Gestão completa de pacientes (CRUD)
- Configuração de planos de questionários (GAD-7, PHQ-9, ASSIST)
- Agendamento de questionários em dias específicos da semana
- Visualização de respostas diárias e resumos semanais
- Análise automática com IA (Gemini) para geração de insights

### 👥 Portal do Paciente (Coletor)
- Login simplificado com código de acesso único
- Resposta a questionários diários (3 dias configurados)
- Preenchimento de resumo semanal após 3 respostas
- Interface intuitiva focada em tarefa

---

## ✅ Funcionalidades Implementadas

### 🔐 Autenticação
- ✅ Login de psicólogo (email, CRP, senha)
- ✅ Registro de psicólogo
- ✅ Login de paciente (código de acesso)
- ✅ Persistência de sessão com JWT tokens
- ✅ Proteção de rotas autenticadas

### 📋 Gestão de Pacientes (Psicólogo)
- ✅ Criar pacientes
- ✅ Listar todos os pacientes
- ✅ Editar informações do paciente
- ✅ Eliminar paciente
- ✅ Gerar código de acesso único automático

### 🎯 Configuração de Questionários
- ✅ Selecionar 3 dias da semana para questionários
- ✅ Atribuir questionários específicos a cada dia
- ✅ Visualização do plano configurado
- ✅ Armazenamento em JSONB (banco de dados)
- ✅ Suporte para compatibilidade com formato antigo

### 📝 Questionários
- ✅ **GAD-7** (Escala de Ansiedade Generalizada)
- ✅ **PHQ-9** (Escala de Depressão)
- ✅ **PANAS** (Afeto Positivo e Negativo)
- ✅ Respostas dinâmicas com múltiplas opções
- ✅ Cálculo automático de pontuação total

### 📊 Resumos Semanais
- ✅ Disparo automático após 3 respostas completadas
- ✅ Formulário para texto do resumo e expectativa
- ✅ Análise com IA (Gemini)
- ✅ Geração de insights personalizados

### 🧪 Modo de Teste
- ✅ Simulação de datas para desenvolvimento
- ✅ Seletor de data no painel de teste
- ✅ Navegação de dias (anterior/próximo)
- ✅ Botão para reiniciar questionários
- ✅ **CORRIGIDO**: Conversão correta de timezone (America/Sao_Paulo)

### 🐛 Correções de Timezone Recentes
- ✅ **Frontend**: Conversão de data de teste para timezone Brasil antes de enviar
- ✅ **Backend**: Parse correto de datas YYYY-MM-DD usando UTC
- ✅ **getDayOfWeek()**: Algoritmo robusto usando Date.UTC para evitar problemas de timezone local

---

## 📁 Estrutura do Projeto

```
Psidados/
├── 📁 client/                          # Frontend React + Vite
│   ├── 📁 src/
│   │   ├── 📄 App.jsx                 # Aplicação principal (monolítica)
│   │   ├── 📄 index.css               # Estilos Tailwind
│   │   ├── 📄 main.jsx                # Ponto de entrada React
│   │   ├── � components/
│   │   │   ├── TestPanel.jsx          # Painel de teste (simulação de datas)
│   │   │   └── .gitkeep
│   │   ├── � contexts/
│   │   │   └── TestModeContext.jsx    # Context para modo de teste
│   │   ├── � pages/
│   │   │   └── .gitkeep
│   │   ├── 📁 services/
│   │   │   └── .gitkeep
│   │   └── testModeImports.js         # Imports do modo teste
│   ├── 📄 index.html
│   ├── 📄 package.json
│   └── 📄 vite.config.js
│
├── � server/                          # Backend Node.js + Express
│   ├── 📄 server.js                   # Servidor principal (porta 3001)
│   ├── 📄 package.json
│   ├── 📁 config/
│   │   └── db.js                      # Conexão PostgreSQL
│   ├── � controllers/
│   │   ├── authController.js          # Autenticação de psicólogo
│   │   ├── pacienteAuthController.js  # Autenticação de paciente
│   │   ├── pacienteController.js      # Gestão de pacientes
│   │   ├── questionarioController.js  # Lógica de questionários
│   │   └── resumoController.js        # Análise de resumos com IA
│   ├── 📁 routes/
│   │   ├── authRoutes.js
│   │   ├── pacienteAuthRoutes.js
│   │   ├── pacienteRoutes.js
│   │   ├── questionarioRoutes.js
│   │   └── resumoRoutes.js
│   ├── 📁 middleware/
│   │   ├── authMiddleware.js
│   │   └── pacienteAuthMiddleware.js
│   ├── 📁 utils/
│   │   └── fetch.js
│   ├── 📁 db/
│   │   └── schema.sql
│   └── 📁 config/
│
├── 📄 package.json                    # Root (monorepo)
├── 📄 README.md                       # Este arquivo
└── 📄 new.sql                         # Script SQL (ignored)
```

---

## 🚀 Status Atual

### ✅ PRONTO PARA PRODUÇÃO
- Backend Node.js/Express funcionando corretamente
- Frontend React compilando e rodando
- Banco de dados PostgreSQL conectado
- Autenticação com JWT implementada
- Questionários respondendo corretamente
- Resumos semanais com análise IA funcionando
- **Timezone corrigido**: Conversão de datas Brasil funcionando perfeitamente

### 🧪 MODO TESTE FUNCIONAL
- Simulação de datas sem timezone issues
- Navegação entre dias funcionando
- Reinicio de questionários em modo teste

---

## 🔧 Tecnologias Utilizadas

### Frontend
- **React 18** - Framework UI
- **Vite** - Build tool
- **React Router** - Roteamento
- **Tailwind CSS** - Styling
- **Lucide React** - Ícones
- **JavaScript/JSX**

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **PostgreSQL** - Banco de dados
- **JWT** - Autenticação
- **Gemini API** - Análise com IA

---

## 📈 Próximos Passos / Melhorias Futuras

### 🎯 Funcionalidades Planejadas
1. **Dashboard de Psicólogo Aprimorado**
   - Gráficos de evolução de pacientes ao longo do tempo
   - Relatórios em PDF
   - Exportação de dados

2. **Notificações**
   - Email para recordar paciente de responder questionário
   - Push notifications (mobile)

3. **Mobile App**
   - Versão nativa para iOS/Android
   - Progressive Web App (PWA)

4. **Autenticação Avançada**
   - OAuth2 / Google Sign-in
   - Autenticação de dois fatores (2FA)

5. **Auditoria e Conformidade**
   - Log de todas as ações (para LGPD/GDPR)
   - Backup automático
   - Encryption de dados sensíveis

6. **Melhorias de UX**
   - Dark mode
   - Responsividade mobile completa
   - Acessibilidade WCAG

---

## 📝 Como Usar

### Iniciando o Projeto

```bash
# Instalar dependências
npm install

# Inicie servidor e cliente
npm run dev
```

O servidor rodará em `http://localhost:3001`
O cliente rodará em `http://localhost:5173`

### Criando um Psicólogo (Primeiro Uso)

1. Acesse `http://localhost:5173`
2. Clique em "É psicólogo? Crie sua conta"
3. Preencha: Nome, Email, CRP, Senha
4. Login com as credenciais

### Criando um Paciente

1. No dashboard do psicólogo, clique "Adicionar Paciente"
2. Preencha nome e email (opcional)
3. Selecione 3 dias da semana para questionários
4. Compartilhe o código de acesso com o paciente

### Paciente Respondendo Questionário

1. Acesse `http://localhost:5173`
2. Clique em "Portal do Paciente"
3. Digite o código de acesso
4. Responda os questionários nos dias configurados
5. Após 3 respostas, preencha o resumo semanal

### Testando em Modo de Teste

1. Na home, clique "Ativar Modo de Teste" (ambiente de desenvolvimento)
2. Abra o painel "Modo de Teste" no questionário
3. Use o date picker para simular diferentes dias
4. Os questionários responderão baseado na data simulada

---

## 🐛 Problemas Conhecidos / Resolvidos

### ✅ RESOLVIDO: Timezone Offset (Dias Descalibrados)
**Problema**: Questões configuradas para segunda/terça/quarta mostravam terça/quarta/quinta
**Causa**: Conversão incorreta entre UTC e timezone Brasil
**Solução**: 
- Frontend: Converte para timezone Brasil antes de enviar data
- Backend: Parse de datas YYYY-MM-DD usando UTC
- getDayOfWeek(): Usa Date.UTC para cálculos robustos

---

## 🔐 Variáveis de Ambiente

Crie um `.env` na pasta `server/`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/psidados
JWT_SECRET=sua-chave-secreta-muito-segura
GEMINI_API_KEY=sua-chave-gemini-api
NODE_ENV=development
```

---

## 📞 Suporte

Para reportar bugs ou sugerir melhorias, abra uma issue no repositório GitHub.

---

## 📄 Licença

Este projeto é desenvolvido para fins educacionais/acadêmicos.

---

**Última Atualização**: Novembro 2025
**Status**: ✅ Funcional e em desenvolvimento contínuo
