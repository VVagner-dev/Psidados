const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Middleware para proteger rotas que exigem autenticação do PSICÓLOGO.
 * Ele verifica o token JWT e anexa os dados do psicólogo ao 'req'.
 */
const authMiddleware = async (req, res, next) => {
    let token;

    // O token deve estar no cabeçalho 'Authorization' como 'Bearer <token>'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Extrair o token (remove o 'Bearer ')
            token = req.headers.authorization.split(' ')[1];

            // 2. Verificar o token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Buscar o psicólogo no banco de dados pelo ID (sem a senha)
            const query = 'SELECT id, nome, email, crp FROM psicologos WHERE id = $1';
            const result = await db.query(query, [decoded.id]);

            if (result.rows.length === 0) {
                return res.status(401).json({ message: 'Autorização negada, psicólogo não encontrado.' });
            }

            // 4. Anexar o psicólogo ao objeto 'req' para ser usado nos controladores
            req.psicologo = result.rows[0];
            next(); // Avançar para a próxima função (o controlador da rota)

        } catch (error) {
            console.error('Erro no middleware de autenticação:', error.message);
            return res.status(401).json({ message: 'Autorização negada, token inválido.' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Autorização negada, token não fornecido.' });
    }
};

// Exportar como um objeto (para corresponder à importação em pacienteRoutes.js)
module.exports = {
    authMiddleware
};