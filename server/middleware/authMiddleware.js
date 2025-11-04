const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Middleware para proteger rotas.
 * Verifica se o token JWT é válido e anexa os dados do psicólogo ao 'req'.
 */
const proteger = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 1. Extrair o token
      token = req.headers.authorization.split(' ')[1];

      // 2. Verificar o token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Buscar o psicólogo no banco (sem a senha)
      const qFind = 'SELECT id, nome, email, crp, created_at FROM psicologos WHERE id = $1';
      const result = await db.query(qFind, [decoded.id]);

      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Não autorizado, usuário não encontrado.' });
      }
      
      // 4. Anexar o usuário ao 'req'
      req.psicologo = result.rows[0];

      // 5. Chamar a próxima função
      next();

    } catch (error) {
      console.error('Erro na verificação do token:', error.message);
      res.status(401).json({ message: 'Não autorizado, token inválido ou expirado.' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Não autorizado, token não fornecido.' });
  }
};

module.exports = { proteger };
