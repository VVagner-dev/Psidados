// --- Importar Módulos ---
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

// Gerenciamento de erros não tratados
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// --- Importar as Nossas Rotas ---
const authRoutes = require('./routes/authRoutes');
const pacienteRoutes = require('./routes/pacienteRoutes');
const pacienteAuthRoutes = require('./routes/pacienteAuthRoutes');
const questionarioRoutes = require('./routes/questionarioRoutes');
const resumoRoutes = require('./routes/resumoRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração CORS mais específica
app.use(cors({
    origin: 'http://localhost:5173', // Frontend Vite default
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging detalhado
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Body:', req.body);
    }
    next();
});

// Error handler for JSON parsing
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.type === 'entity.parse.failed') {
        console.error('JSON Parse Error:', err);
        return res.status(400).json({
            status: 400,
            message: 'Bad Request - Invalid JSON'
        });
    }
    next(err);
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacienteRoutes);
app.use('/api/paciente-auth', pacienteAuthRoutes);
app.use('/api/questionario', questionarioRoutes);
app.use('/api/resumo', resumoRoutes);

// Rota de teste
app.get('/', (req, res) => {
    res.json({
        message: 'API do PsiDados está no ar! 🚀',
        timestamp: new Date().toISOString()
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    res.status(500).json({
        status: 500,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Inicialização do servidor com retry
const startServer = () => {
    const server = app.listen(PORT, () => {
        console.log(`[${new Date().toISOString()}] Servidor PsiDados rodando na porta ${PORT}`);
        console.log(`Acesse http://localhost:${PORT} para testar.`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Porta ${PORT} em uso, tentando novamente em 5 segundos...`);
            setTimeout(() => {
                server.close();
                startServer();
            }, 5000);
        } else {
            console.error('Erro do servidor:', err);
        }
    });

    // Gerenciamento adequado de encerramento
    const shutdown = () => {
        console.log('\nRecebido sinal de encerramento...');
        server.close(() => {
            console.log('Servidor HTTP fechado.');
            db.pool.end(() => {
                console.log('Conexões do banco de dados fechadas.');
                process.exit(0);
            });
        });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
};

// Iniciar servidor
startServer();