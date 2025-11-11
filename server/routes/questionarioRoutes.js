const express = require('express');
const router = express.Router();
const { protegerPaciente } = require('../middleware/pacienteAuthMiddleware');

// 1. Importamos as funções
const { 
    buscarQuestionarioDoDia,
    salvarRespostaDiaria,
    reiniciarQuestionarios,
    debugRespostas
} = require('../controllers/questionarioController');

// Log de debug
console.log('🔍 [questionarioRoutes.js] Verificando funções importadas:');
console.log('   buscarQuestionarioDoDia:', typeof buscarQuestionarioDoDia);
console.log('   salvarRespostaDiaria:', typeof salvarRespostaDiaria);
console.log('   reiniciarQuestionarios:', typeof reiniciarQuestionarios);
console.log('   debugRespostas:', typeof debugRespostas);

// Aplicar o middleware de proteção do PACIENTE a todas as rotas abaixo
router.use(protegerPaciente);

// Rota para o paciente buscar o questionário do dia
// GET /api/questionario/hoje
router.get('/hoje', buscarQuestionarioDoDia);

// 2. Adicionamos a nova rota
// Rota para o paciente enviar as respostas do dia
// POST /api/questionario/responder
router.post('/responder', salvarRespostaDiaria);

// 3. Rota para reiniciar questionários (modo teste)
// POST /api/questionario/reiniciar
router.post('/reiniciar', reiniciarQuestionarios);

// 4. Rota DEBUG - listar todas as respostas do paciente
// GET /api/questionario/debug
router.get('/debug', debugRespostas);

console.log('✅ [questionarioRoutes.js] Rotas registradas com sucesso!'); 

module.exports = router;