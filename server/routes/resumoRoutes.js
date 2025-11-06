// --- Rotas de Resumo Semanal ---
// Estas rotas são acedidas pelo PACIENTE

const express = require('express');
const router = express.Router();

// 1. Importar o middleware de proteção do PACIENTE
const { protegerPaciente } = require('../middleware/pacienteAuthMiddleware');
// 2. Importar o controlador de resumo
const { salvarResumoSemanal } = require('../controllers/resumoController');

// Aplicar o middleware de proteção do PACIENTE a todas as rotas deste ficheiro
router.use(protegerPaciente);

// Definir a rota para o paciente ENVIAR o seu resumo semanal
// Caminho completo: POST /api/resumo/semanal
router.post('/semanal', salvarResumoSemanal);

module.exports = router;