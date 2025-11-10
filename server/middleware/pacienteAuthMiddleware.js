// --- Middleware de Autenticação do Paciente ---
// Verifica se o token JWT é válido e pertence a um paciente.

const jwt = require('jsonwebtoken');
const db = require('../config/db');

const protegerPaciente = async (req, res, next) => {
    console.log('=== Iniciando validação de token ===');
    console.log('Headers recebidos:', {
        auth: req.headers.authorization ? 'Presente' : 'Ausente',
        contentType: req.headers['content-type']
    });

    try {
        // 1. Verificar se o header de autorização existe e está no formato correto
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.log('Header de autorização ausente');
            return res.status(401).json({ message: 'Não autorizado, sem token.' });
        }

        // 2. Verificar se é um token Bearer válido
        if (!authHeader.startsWith('Bearer ')) {
            console.log('Token não está no formato Bearer');
            return res.status(401).json({ message: 'Formato de token inválido.' });
        }

        // 3. Extrair e verificar o token
        const token = authHeader.split(' ')[1];
        if (!token) {
            console.log('Token não encontrado após Bearer');
            return res.status(401).json({ message: 'Token não fornecido.' });
        }

        // 4. Decodificar o token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decodificado:', { id: decoded.id, tipo: decoded.tipo });

        // 5. Validar tipo de usuário
        if (decoded.tipo !== 'paciente') {
            console.log('Token não é do tipo paciente:', decoded.tipo);
            return res.status(401).json({ message: 'Token inválido: tipo de usuário incorreto.' });
        }

        // 6. Validar ID do paciente
        if (!decoded.id) {
            console.log('Token não contém ID do paciente');
            return res.status(401).json({ message: 'Token inválido: ID não encontrado.' });
        }

        // 7. Buscar paciente no banco
        const query = "SELECT id, email, psicologo_id FROM pacientes WHERE id = $1";
        const result = await db.query(query, [decoded.id]);

        if (result.rows.length === 0) {
            console.log('Paciente não encontrado:', decoded.id);
            return res.status(401).json({ message: 'Paciente não encontrado.' });
        }

        // 8. Anexar dados ao request
        req.paciente = {
            ...result.rows[0],
            tipo: 'paciente'
        };

        console.log('Validação concluída com sucesso para paciente:', req.paciente.id);
        next();

    } catch (error) {
        console.error('Erro na validação do token:', error.message);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Token inválido.' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expirado.' });
        }
        return res.status(401).json({ message: 'Falha na autenticação.' });
    }
};

module.exports = { protegerPaciente };
