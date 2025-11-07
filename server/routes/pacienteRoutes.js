const express = require('express');
const router = express.Router();

// --- Importações dos Controladores ---

// 1. Funções do pacienteController (Isto está correto)
const { 
    criarPaciente, 
    listarPacientes, 
    buscarPacientePorId, 
    atualizarPaciente, 
    deletarPaciente,
    buscarRespostasDoPaciente,
    buscarResumosSemanaisDoPaciente
} = require('../controllers/pacienteController');

// 2. Funções do questionarioController (Isto está correto)
const { definirQuestionario } = require('../controllers/questionarioController');

// 3. Importar o middleware de autenticação do Psicólogo
// (ESTA ERA A LINHA COM ERRO)
// O nome da função exportada é 'authMiddleware'.
const { authMiddleware } = require('../middleware/authMiddleware');


// --- Rotas CRUD para Pacientes (Protegidas) ---
// (Usando a variável 'authMiddleware' importada corretamente)
router.post('/', authMiddleware, criarPaciente);
router.get('/', authMiddleware, listarPacientes);
router.get('/:id', authMiddleware, buscarPacientePorId);
router.put('/:id', authMiddleware, atualizarPaciente);
router.delete('/:id', authMiddleware, deletarPaciente);

// --- Rota de Configuração (Protegida) ---
// POST /api/pacientes/:id/questionario
router.post('/:id/questionario', authMiddleware, definirQuestionario);

// --- Rotas de Leitura de Dados (Protegidas) ---

// GET /api/pacientes/:id/respostas-diarias
router.get('/:id/respostas-diarias', authMiddleware, buscarRespostasDoPaciente);

// GET /api/pacientes/:id/resumos-semanais
router.get('/:id/resumos-semanais', authMiddleware, buscarResumosSemanaisDoPaciente);


module.exports = router;