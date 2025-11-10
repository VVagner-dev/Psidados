// --- Controladores de Autenticação do Paciente ---
// Lida com o login do paciente usando o código de acesso.

// Importa a conexão com o banco
const db = require('../config/db');
// Importa o JWT para criar o token
const jwt = require('jsonwebtoken');

/**
 * @route   POST /api/paciente-auth/login
 * @desc    Autentica um paciente usando o código de acesso
 * @access  Public
 */
const loginPaciente = async (req, res) => {
    try {
        const { codigo_acesso } = req.body;

        // 1. Validação
        if (!codigo_acesso) {
            return res.status(400).json({ message: "O código de acesso é obrigatório." });
        }

        // 2. Buscar o paciente pelo código
        const query = "SELECT * FROM pacientes WHERE codigo_acesso = $1";
        const result = await db.query(query, [codigo_acesso]);

        // 3. Verificar se o paciente foi encontrado
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Código de acesso inválido." });
        }

        const paciente = result.rows[0];

        // 4. Gerar um Token JWT para o paciente
        const iat = Math.floor(Date.now() / 1000);
        const payload = {
            id: paciente.id,
            nome: paciente.nome,
            email: paciente.email,
            tipo: 'paciente',
            iat: iat,
            exp: iat + (24 * 60 * 60), // 24 horas a partir de agora
            nbf: iat // válido imediatamente
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { 
                algorithm: 'HS256'
            }
        );

        // 5. Preparar resposta com dados completos
        const responseData = {
            message: "Login do paciente realizado com sucesso!",
            token: token,
            paciente: {
                id: paciente.id,
                nome: paciente.nome,
                email: paciente.email
            },
            auth: {
                iat: payload.iat,
                exp: payload.exp,
                tipo: 'paciente'
            }
        };

        // Enviar resposta
        res.status(200).json(responseData);

    } catch (error) {
        console.error("Erro no login do paciente:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

module.exports = {
    loginPaciente
};
