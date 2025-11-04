// --- Middleware de Autenticação do Paciente ---
// Verifica se o token JWT é válido e pertence a um paciente.

const jwt = require('jsonwebtoken');
const db = require('../config/db');

const protegerPaciente = async (req, res, next) => {
    let token;

    // 1. Verificar se o token 'Bearer' existe no header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 2. Extrair o token
            token = req.headers.authorization.split(' ')[1];

            // 3. Verificar o token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 4. VERIFICAR SE É UM TOKEN DE PACIENTE
            if (decoded.tipo !== 'paciente') {
                return res.status(401).json({ message: 'Não autorizado, token inválido.' });
            }

            // 5. Buscar o paciente no banco de dados
            const query = "SELECT id, nome, email, psicologo_id FROM pacientes WHERE id = $1";
            const result = await db.query(query, [decoded.id]);

            if (result.rows.length === 0) {
                return res.status(401).json({ message: 'Não autorizado, paciente não encontrado.' });
            }

            // 6. Anexar os dados do paciente ao 'req'
            req.paciente = result.rows[0];
            
            // 7. Passar para o próximo middleware/controller
            next();

        } catch (error) {
            console.error('Erro no middleware do paciente:', error);
            res.status(401).json({ message: 'Não autorizado, token falhou.' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Não autorizado, sem token.' });
    }
};

module.exports = { protegerPaciente };
