// Importa o 'path' para resolver caminhos de arquivos
const path = require('path');

// --- Carregamento de Variáveis de Ambiente ---
// Diz ao 'dotenv' para carregar o arquivo .env
// que está no mesmo diretório que este arquivo (server/server.js)
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// --- LINHA DE DIAGNÓSTICO ---
console.log("[DIAGNÓSTICO] Senha lida do .env:", process.env.DB_PASSWORD);
// --- FIM DA LINHA DE DIAGNÓSTICO ---

// Importa as bibliotecas necessárias
const express = require('express');
const cors = require('cors');
const db = require('./config/db'); // Importa a conexão DB

// --- Configuração Inicial ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- Middlewares Essenciais ---
app.use(cors());
app.use(express.json());

// --- Definição das Rotas ---

// Rotas do Psicólogo
const authRoutes = require('./routes/authRoutes');
const pacienteRoutes = require('./routes/pacienteRoutes'); // Este arquivo também foi atualizado
app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacienteRoutes);

// Rotas de Autenticação do Paciente
const pacienteAuthRoutes = require('./routes/pacienteAuthRoutes.js');
app.use('/api/paciente-auth', pacienteAuthRoutes);

// Rotas do Questionário (Lado do Paciente)
const questionarioRoutes = require('./routes/questionarioRoutes.js'); // <-- NOVO
app.use('/api/questionario', questionarioRoutes); // <-- NOVO


// --- Rotas de Teste ---
app.get('/', (req, res) => {
    res.send('API do PsiDados está no ar! 🚀');
});

app.get('/api/db-test', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.status(200).json({
            message: 'Conexão com o PostgreSQL (Aiven) bem-sucedida!',
            db_time: result.rows[0].now,
        });
    } catch (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        res.status(500).json({
            message: 'Erro ao conectar ao banco de dados.',
            error: err.message,
        });
    }
});

// --- Inicialização do Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor PsiDados rodando na porta ${PORT}`);
    console.log(`Acesse http://localhost:${PORT} para testar.`);
});

