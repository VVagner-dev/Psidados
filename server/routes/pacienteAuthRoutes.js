// --- Rotas de Autenticação do Paciente ---

const express = require('express');
const router = express.Router();

// Importa o controller
const { loginPaciente } = require('../controllers/pacienteAuthController.js');

// Define a rota para LOGAR o paciente
// Caminho completo: POST /api/paciente-auth/login
router.post('/login', loginPaciente);

module.exports = router;
