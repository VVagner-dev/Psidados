// --- Rotas de Pacientes (CRUD e Configs) ---

const express = require('express');
const router = express.Router();

// Controladores
const {
    criarPaciente,
    listarPacientes,
    obterPaciente,
    atualizarPaciente,
    deletarPaciente
} = require('../controllers/pacienteController.js');

// IMPORTA a nova função do outro controller
const { definirQuestionario } = require('../controllers/questionarioController.js');

// Middleware (do Psicólogo)
const { proteger } = require('../middleware/authMiddleware.js');

// Aplicar o middleware de proteção do PSICÓLOGO em todas as rotas
router.use(proteger);

// --- CRUD de Pacientes ---
router.post('/', criarPaciente);
router.get('/', listarPacientes);
router.get('/:id', obterPaciente);
router.put('/:id', atualizarPaciente);
router.delete('/:id', deletarPaciente);

// --- Configuração do Questionário (A LINHA QUE FALTAVA) ---
// POST /api/pacientes/:id/questionario
router.post('/:id/questionario', definirQuestionario);

module.exports = router;

