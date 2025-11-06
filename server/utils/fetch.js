// --- Utilitário de Fetch ---
// O Node.js na versão que usamos (CommonJS) não tem 'fetch' globalmente.
// Esta é uma forma de o importar para que o resto da aplicação o possa usar.

// Usamos o node-fetch (versão 2) que é compatível com 'require'
const fetch = require('node-fetch');

// Exportamos o fetch para que o resumoController.js o possa importar
module.exports = { fetch };