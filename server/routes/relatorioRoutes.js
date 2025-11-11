const express = require('express');
const router = express.Router();
const { obterRelatorioSemanal, gerarAnaliseIA } = require('../controllers/relatorioController');
const authMiddleware = require('../middleware/authMiddleware');

// Obter relatório semanal
router.get('/semana/:paciente_id', authMiddleware, obterRelatorioSemanal);

// Gerar análise com IA
router.post('/gerar-ia/:paciente_id', authMiddleware, gerarAnaliseIA);

module.exports = router;
