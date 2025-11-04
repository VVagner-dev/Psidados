// --- Rotas do Questionário (Lado do Paciente) ---

const express = require('express');
const router = express.Router();
const { buscarQuestionarioDoDia } = require('../controllers/questionarioController.js');
const { protegerPaciente } = require('../middleware/pacienteAuthMiddleware.js');

// Aplicar o middleware de proteção do paciente em todas as rotas
router.use(protegerPaciente);

// GET /api/questionario/hoje
// Busca o questionário configurado para o dia de hoje
router.get('/hoje', buscarQuestionarioDoDia);

// (Aqui entrarão as rotas de POST /api/questionario/responder, etc.)

module.exports = router;
