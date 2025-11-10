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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((err, req, res, next) => {
    console.error('Error middleware:', err);
    if (err instanceof SyntaxError || err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'JSON inválido no corpo da requisição.' });
    }
    next(err);
});

// Adicionar middleware de log para todas as requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacienteRoutes);
app.use('/api/paciente-auth', pacienteAuthRoutes);
app.use('/api/questionario', questionarioRoutes);
app.use('/api/resumo', resumoRoutes);

app.get('/', (req, res) => {
    res.send('API do PsiDados está no ar! 🚀');
});

// Middleware para tratamento de erros global
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({ message: 'Erro interno do servidor.' });
});

const server = app.listen(PORT, () => {
    console.log(`Servidor PsiDados rodando na porta ${PORT}`);
    console.log(`Acesse http://localhost:${PORT} para testar.`);
});

// Gerenciamento adequado de encerramento
process.on('SIGTERM', () => {
    console.info('SIGTERM received');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
