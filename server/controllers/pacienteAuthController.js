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
        // Este token só contém o ID do paciente e seu "tipo"
        const payload = {
            id: paciente.id,
            tipo: 'paciente' // Importante para diferenciar do token do psicólogo
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET, // Usamos a mesma chave secreta do .env
            { expiresIn: '8h' }
        );

        // 5. Enviar o token e os dados do paciente
        res.status(200).json({
            message: "Login do paciente realizado com sucesso!",
            token: token,
            paciente: {
                id: paciente.id,
                nome: paciente.nome,
                email: paciente.email
            }
        });

    } catch (error) {
        console.error("Erro no login do paciente:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

module.exports = {
    loginPaciente
};
