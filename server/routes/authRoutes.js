const express = require('express');
const router = express.Router();

// Importa o controller que terá a lógica
const authController = require('../controllers/authController');

// Define a rota para REGISTRAR um novo psicólogo
// Caminho completo: POST /api/auth/registrar
// Corrigido de authController.register para authController.registrar
router.post('/registrar', authController.registrar);

// Define a rota para LOGAR um psicólogo
// Caminho completo: POST /api/auth/login
router.post('/login', authController.login);

module.exports = router;
