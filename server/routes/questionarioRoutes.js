const express = require('express');
const router = express.Router();
const { protegerPaciente } = require('../middleware/pacienteAuthMiddleware');

// 1. Importamos as funções
const { 
    buscarQuestionarioDoDia,
    salvarRespostaDiaria 
} = require('../controllers/questionarioController');

// Aplicar o middleware de proteção do PACIENTE a todas as rotas abaixo
router.use(protegerPaciente);

// Rota para o paciente buscar o questionário do dia
// GET /api/questionario/hoje
router.get('/hoje', buscarQuestionarioDoDia);

// 2. Adicionamos a nova rota
// Rota para o paciente enviar as respostas do dia
// POST /api/questionario/responder
router.post('/responder', salvarRespostaDiaria); 

module.exports = router;