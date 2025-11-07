const db = require('../config/db');

/**
 * @route   POST /api/pacientes
 * @desc    (Psicólogo) Cria um novo paciente
 * @access  Privado (Psicólogo)
 */
const criarPaciente = async (req, res) => {
    try {
        const { nome, email } = req.body;
        const psicologoId = req.psicologo.id; // Vem do middleware 'authMiddleware'

        if (!nome) {
            return res.status(400).json({ message: 'O nome é obrigatório.' });
        }

        // 1. Gerar um código de acesso único (ex: "EXLT5N")
        // Esta é uma função simples; em produção, seria bom verificar se já existe
        const codigo_acesso = Math.random().toString(36).substring(2, 8).toUpperCase();

        // 2. Salvar no banco
        const query = `
            INSERT INTO pacientes (nome, email, codigo_acesso, psicologo_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *; 
        `;
        const values = [nome, email || null, codigo_acesso, psicologoId];
        
        const result = await db.query(query, values);

        res.status(201).json({
            message: "Paciente criado com sucesso!",
            paciente: result.rows[0]
        });

    } catch (error) {
        console.error("Erro ao criar paciente:", error);
        if (error.code === '23505') { // Código de violação de unicidade (ex: email ou codigo_acesso)
            return res.status(409).json({ message: "Já existe um paciente com este email ou o código gerado colidiu. Tente novamente." });
        }
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

/**
 * @route   GET /api/pacientes
 * @desc    (Psicólogo) Lista todos os pacientes do psicólogo logado
 * @access  Privado (Psicólogo)
 */
const listarPacientes = async (req, res) => {
    try {
        const psicologoId = req.psicologo.id;
        
        const query = 'SELECT * FROM pacientes WHERE psicologo_id = $1 ORDER BY nome ASC';
        const result = await db.query(query, [psicologoId]);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Erro ao listar pacientes:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

/**
 * @route   GET /api/pacientes/:id
 * @desc    (Psicólogo) Busca um paciente específico pelo ID
 * @access  Privado (Psicólogo)
 */
const buscarPacientePorId = async (req, res) => {
    try {
        const { id } = req.params;
        const psicologoId = req.psicologo.id;

        const query = 'SELECT * FROM pacientes WHERE id = $1 AND psicologo_id = $2';
        const result = await db.query(query, [id, psicologoId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Paciente não encontrado ou não pertence a este psicólogo." });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Erro ao buscar paciente:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

/**
 * @route   PUT /api/pacientes/:id
 * @desc    (Psicólogo) Atualiza os dados de um paciente
 * @access  Privado (Psicólogo)
 */
const atualizarPaciente = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email } = req.body;
        const psicologoId = req.psicologo.id;

        if (!nome && !email) {
            return res.status(400).json({ message: "Envie pelo menos 'nome' ou 'email' para atualizar." });
        }

        // Construir a query dinamicamente
        let query = 'UPDATE pacientes SET ';
        const values = [];
        let paramCount = 1;

        if (nome) {
            query += `nome = $${paramCount++} `;
            values.push(nome);
        }
        if (email) {
            query += `${nome ? ',' : ''} email = $${paramCount++} `;
            values.push(email);
        }

        query += `WHERE id = $${paramCount++} AND psicologo_id = $${paramCount++} RETURNING *;`;
        values.push(id, psicologoId);

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Paciente não encontrado ou não pertence a este psicólogo." });
        }

        res.status(200).json({
            message: "Paciente atualizado com sucesso!",
            paciente: result.rows[0]
        });

    } catch (error) {
        console.error("Erro ao atualizar paciente:", error);
         if (error.code === '23505') { // Email duplicado
            return res.status(409).json({ message: "Este email já está em uso por outro paciente." });
        }
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

/**
 * @route   DELETE /api/pacientes/:id
 * @desc    (Psicólogo) Deleta um paciente
 * @access  Privado (Psicólogo)
 */
const deletarPaciente = async (req, res) => {
    try {
        const { id } = req.params;
        const psicologoId = req.psicologo.id;

        const query = 'DELETE FROM pacientes WHERE id = $1 AND psicologo_id = $2 RETURNING *;';
        const result = await db.query(query, [id, psicologoId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Paciente não encontrado ou não pertence a este psicólogo." });
        }

        res.status(200).json({ 
            message: "Paciente deletado com sucesso.",
            pacienteDeletado: result.rows[0]
        });
    } catch (error) {
        console.error("Erro ao deletar paciente:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};


// --- NOVAS FUNÇÕES ADICIONADAS ---

/**
 * @route   GET /api/pacientes/:id/respostas-diarias
 * @desc    (Psicólogo) Busca o histórico de respostas diárias de um paciente
 * @access  Privado (Psicólogo)
 */
const buscarRespostasDoPaciente = async (req, res) => {
    try {
        const { id: pacienteId } = req.params;
        const psicologoId = req.psicologo.id;

        // 1. Verificar se o psicólogo é dono deste paciente (Segurança)
        const pacienteCheck = await db.query(
            'SELECT id FROM pacientes WHERE id = $1 AND psicologo_id = $2',
            [pacienteId, psicologoId]
        );

        if (pacienteCheck.rows.length === 0) {
            return res.status(404).json({ message: "Paciente não encontrado ou não pertence a este psicólogo." });
        }

        // 2. Buscar as respostas (ordenadas pela mais recente)
        const respostasResult = await db.query(
            'SELECT * FROM respostas_diarias WHERE paciente_id = $1 ORDER BY data_resposta DESC',
            [pacienteId]
        );

        res.status(200).json(respostasResult.rows);

    } catch (error) {
        console.error("Erro ao buscar respostas diárias do paciente:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

/**
 * @route   GET /api/pacientes/:id/resumos-semanais
 * @desc    (Psicólogo) Busca os resumos semanais e análises de IA de um paciente
 * @access  Privado (Psicólogo)
 */
const buscarResumosSemanaisDoPaciente = async (req, res) => {
    try {
        const { id: pacienteId } = req.params;
        const psicologoId = req.psicologo.id;

        // 1. Verificar se o psicólogo é dono deste paciente (Segurança)
        const pacienteCheck = await db.query(
            'SELECT id FROM pacientes WHERE id = $1 AND psicologo_id = $2',
            [pacienteId, psicologoId]
        );

        if (pacienteCheck.rows.length === 0) {
            return res.status(404).json({ message: "Paciente não encontrado ou não pertence a este psicólogo." });
        }

        // 2. Buscar os resumos (ordenados pelo mais recente)
        const resumosResult = await db.query(
            'SELECT * FROM resumos_semanais WHERE paciente_id = $1 ORDER BY data_fim_semana DESC',
            [pacienteId]
        );

        res.status(200).json(resumosResult.rows);

    } catch (error) {
        console.error("Erro ao buscar resumos semanais do paciente:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};


// --- EXPORTA TODAS AS FUNÇÕES ---
// (Esta é a parte crucial que corrige o erro de importação)
module.exports = {
    criarPaciente,
    listarPacientes,
    buscarPacientePorId,
    atualizarPaciente,
    deletarPaciente,
    // Novas exportações
    buscarRespostasDoPaciente,
    buscarResumosSemanaisDoPaciente
};