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
// Testa a conexão assim que o módulo é carregado e loga o resultado
pool.connect()
  .then(client => {
    client.release();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso.');
  })
  .catch(err => {
    console.error('❌ Falha ao conectar ao banco de dados:', err.message || err);
    // Não encerra o processo automaticamente para permitir depuração local,
    // mas o log acima ajudará a identificar problemas de credenciais/SSL.
  });

// Exporta um objeto com um método "query" e também o pool caso seja necessário
module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};