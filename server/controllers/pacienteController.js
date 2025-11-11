const db = require('../config/db');

/**
 * @route   POST /api/pacientes
 * @desc    (Psicólogo) Cria um novo paciente
 * @access  Privado (Psicólogo)
 */
const criarPaciente = async (req, res) => {
    try {
        console.log('Received request body:', req.body); // Debug log
        const psicologoId = req.psicologo.id;
        const nome_completo = req.body.nome;
        let email = req.body.email;

        if (!nome_completo) {
            return res.status(400).json({ message: 'O nome é obrigatório.' });
        }

        // Converter string vazia em NULL para evitar violação de UNIQUE constraint
        email = (email && email.trim()) ? email.trim() : null;

        // 1. Gerar um código de acesso único (ex: "EXLT5N")
        // Esta é uma função simples; em produção, seria bom verificar se já existe
        const codigo_acesso = Math.random().toString(36).substring(2, 8).toUpperCase();

        // 2. Salvar no banco
        const query = `
            INSERT INTO pacientes (nome, email, codigo_acesso, psicologo_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *; 
        `;
        const values = [nome_completo, email, codigo_acesso, psicologoId];
        
        const result = await db.query(query, values);

        res.status(201).json({
            message: "Paciente criado com sucesso!",
            id: result.rows[0].id,
            codigo_acesso: result.rows[0].codigo_acesso,
            nome: result.rows[0].nome,
            paciente: result.rows[0]
        });

    } catch (error) {
        console.error("Erro ao criar paciente:", error);
        console.error("Erro code:", error.code);
        console.error("Erro message:", error.message);
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
        
        const query = 'SELECT id, nome, email, codigo_acesso, psicologo_id, created_at FROM pacientes WHERE psicologo_id = $1 ORDER BY nome ASC';
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

        // Preparar dados do paciente para resposta, incluindo configuração de questionários se existir
        const pacienteRow = result.rows[0];

        // Buscar a configuração de questionários deste paciente (se existir)
        const configResult = await db.query(
            'SELECT tipo_questionario, frequencia_dias, configuracao FROM config_questionarios WHERE paciente_id = $1',
            [id]
        );

        const pacienteData = { ...pacienteRow };

        if (configResult.rows.length > 0) {
            const config = configResult.rows[0];
            pacienteData.tipo_questionario = config.tipo_questionario;
            pacienteData.frequencia_dias = config.frequencia_dias;
            pacienteData.configuracao = config.configuracao;
            // Campos compatíveis com o frontend
            pacienteData.questionario_nome = config.tipo_questionario;
            pacienteData.frequencia = (config.frequencia_dias && config.frequencia_dias.length > 0)
                ? config.frequencia_dias.join(', ')
                : 'N/A';
        } else {
            pacienteData.questionario_nome = null;
            pacienteData.frequencia = 'N/A';
        }

        return res.status(200).json(pacienteData);
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

        // 2. Buscar as respostas (ordenadas pela mais recente) e calcular porcentagem
        const respostasResult = await db.query(`
            SELECT 
                id,
                paciente_id,
                data_resposta,
                respostas,
                respostas->>'questionarioId' as questionario_id,
                CASE 
                    WHEN respostas->'respostas' IS NOT NULL THEN
                        (SELECT COALESCE(SUM((value)::integer), 0)
                         FROM jsonb_each_text(respostas->'respostas') AS arr(key, value)
                         WHERE value ~ '^[0-9]+$'
                        )
                    ELSE 0 
                END as pontuacao_total,
                CASE 
                    WHEN respostas->>'questionarioId' = 'questionario1' THEN 'GAD-7 (Ansiedade)'
                    WHEN respostas->>'questionarioId' = 'questionario2' THEN 'PHQ-9 (Depressão)'
                    WHEN respostas->>'questionarioId' = 'questionario3' THEN 'PANAS (Afeto Positivo e Negativo)'
                    ELSE 'Questionário'
                END as questionario_nome,
                CASE 
                    WHEN respostas->>'questionarioId' = 'questionario1' THEN 21
                    WHEN respostas->>'questionarioId' = 'questionario2' THEN 27
                    WHEN respostas->>'questionarioId' = 'questionario3' THEN 100
                    ELSE 100
                END as pontuacao_maxima,
                ROUND(
                    CASE 
                        WHEN respostas->'respostas' IS NOT NULL THEN
                            (SELECT COALESCE(SUM((value)::integer), 0)
                             FROM jsonb_each_text(respostas->'respostas') AS arr(key, value)
                             WHERE value ~ '^[0-9]+$'
                            )
                        ELSE 0 
                    END::numeric * 100.0 /
                    CASE 
                        WHEN respostas->>'questionarioId' = 'questionario1' THEN 21
                        WHEN respostas->>'questionarioId' = 'questionario2' THEN 27
                        WHEN respostas->>'questionarioId' = 'questionario3' THEN 100
                        ELSE 100
                    END, 1
                ) as percentual
            FROM respostas_diarias 
            WHERE paciente_id = $1 
            ORDER BY data_resposta DESC
        `, [pacienteId]);

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