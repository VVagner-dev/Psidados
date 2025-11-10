// --- Importar Módulos ---
const path = require('path'); // Módulo 'path' nativo do Node.js
// Configurar o dotenv para ler o .env DENTRO da pasta /server
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const db = require('./config/db'); // A nossa ligação à base de dados

// --- LINHA DE DIAGNÓSTICO ---
// (Remover em produção)
console.log("[DIAGNÓSTICO] Senha lida do .env:", process.env.DB_PASSWORD);
// --- FIM DA LINHA DE DIAGNÓSTICO ---


// --- Importar as Nossas Rotas ---
const authRoutes = require('./routes/authRoutes');
const pacienteRoutes = require('./routes/pacienteRoutes');
const pacienteAuthRoutes = require('./routes/pacienteAuthRoutes');
const questionarioRoutes = require('./routes/questionarioRoutes');
const resumoRoutes = require('./routes/resumoRoutes'); // <-- ADICIONADO PARA A IA

// --- Configuração Inicial ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- Middlewares Essenciais ---
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); // Permite ao Express ler JSON do body
app.use(express.urlencoded({ extended: true })); // Permite ler dados de formulários

// --- Tratador de erro para JSON inválido enviado pelo cliente ---
// Este middleware captura erros de parse feitos pelo body-parser/express.json
// e retorna um JSON com mensagem de erro em vez da página HTML padrão.
app.use((err, req, res, next) => {
    if (err && (err instanceof SyntaxError || err.type === 'entity.parse.failed')) {
        console.error('[ERRO] JSON inválido no corpo da requisição:', err.message);
        return res.status(400).json({ message: 'JSON inválido no corpo da requisição.' });
    }
    next();
});

// --- Rotas da API ---
// O Express vai "ligar" os prefixos de URL aos ficheiros de rotas corretos
app.use('/api/auth', authRoutes); // Login/Registro (Psicólogo)
app.use('/api/pacientes', pacienteRoutes); // CRUD de Pacientes (Psicólogo)
app.use('/api/paciente-auth', pacienteAuthRoutes); // Login (Paciente)
app.use('/api/questionario', questionarioRoutes); // Buscar/Responder Questionário (Paciente)
app.use('/api/resumo', resumoRoutes); // <-- ADICIONADO PARA A IA (Linha 42)

// --- Rota "Raiz" (Teste) ---
app.get('/', (req, res) => {
    res.send('API do PsiDados está no ar! 🚀');
});

// --- Inicialização do Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor PsiDados rodando na porta ${PORT}`);
    console.log(`Acesse http://localhost:${PORT} para testar.`);
});