// Importa a biblioteca 'dotenv' para carregar as variáveis do .env
require('dotenv').config();

// Importa a classe Pool da biblioteca 'pg'
const { Pool } = require('pg');

// Cria uma nova instância do Pool com as configurações do nosso .env
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    
    // Configuração de SSL OBRIGATÓRIA para o Aiven
    ssl: {
      rejectUnauthorized: false
    },
});

// Exporta um objeto com um método "query"
// Isso permite que o resto da nossa aplicação execute queries
// de forma simples, ex: db.query("SELECT * FROM ...")
module.exports = {
    query: (text, params) => pool.query(text, params),
};