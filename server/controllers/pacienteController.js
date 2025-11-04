const db = require('../config/db');

// Função auxiliar para gerar um código simples
function gerarCodigoAcesso() {
  // Gera um código alfanumérico de 6 caracteres maiúsculos
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * @route   POST /api/pacientes
 * @desc    Registra um novo paciente (baseado no schema.sql)
 * @access  Private
 */
const criarPaciente = async (req, res) => {
  try {
    // Usamos os campos do SEU schema.sql: nome, email
    const { nome, email } = req.body;
    const psicologoId = req.psicologo.id; // Vem do middleware 'proteger'

    // 1. Validação
    if (!nome) {
      return res.status(400).json({ message: "O nome do paciente é obrigatório." });
    }

    // 2. Gerar um código de acesso único
    const codigoAcesso = gerarCodigoAcesso(); 
    // (Em um app real, precisaríamos verificar se esse código já existe)

    // 3. Inserir no banco
    const qInsert = `
      INSERT INTO pacientes (nome, email, codigo_acesso, psicologo_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await db.query(qInsert, [nome, email, codigoAcesso, psicologoId]);

    res.status(201).json({ message: "Paciente criado com sucesso!", paciente: result.rows[0] });

  } catch (error) {
    console.error("Erro ao criar paciente:", error);
    // Trata erro de violação de chave única (ex: email ou codigo_acesso)
    if (error.code === '23505') { 
        if (error.constraint.includes('email')) {
             return res.status(409).json({ message: "O email fornecido já está em uso." });
        }
         if (error.constraint.includes('codigo_acesso')) {
             return res.status(500).json({ message: "Erro ao gerar código. Tente novamente." });
        }
        return res.status(409).json({ message: "Erro de duplicidade." });
    }
    res.status(500).json({ message: "Erro interno no servidor." });
  }
};

/**
 * @route   GET /api/pacientes
 * @desc    Lista TODOS os pacientes do psicólogo logado
 * @access  Private
 */
const listarPacientes = async (req, res) => {
  try {
    const psicologoId = req.psicologo.id;
    
    const qFind = 'SELECT * FROM pacientes WHERE psicologo_id = $1 ORDER BY nome ASC';
    const result = await db.query(qFind, [psicologoId]);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error("Erro ao listar pacientes:", error);
    res.status(500).json({ message: "Erro interno no servidor." });
  }
};

/**
 * @route   GET /api/pacientes/:id
 * @desc    Obtém UM paciente específico pelo ID
 * @access  Private
 */
const obterPaciente = async (req, res) => {
  try {
    const { id } = req.params;
    const psicologoId = req.psicologo.id;

    // A query já garante que o psicólogo só pode ver o seu próprio paciente
    const qFind = 'SELECT * FROM pacientes WHERE id = $1 AND psicologo_id = $2';
    const result = await db.query(qFind, [id, psicologoId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Paciente não encontrado." });
    }

    res.status(200).json(result.rows[0]);

  } catch (error) {
    console.error("Erro ao obter paciente:", error);
    res.status(500).json({ message: "Erro interno no servidor." });
  }
};


/**
 * @route   PUT /api/pacientes/:id
 * @desc    Atualiza os dados de UM paciente
 * @access  Private
 */
const atualizarPaciente = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email } = req.body; // Campos do schema.sql
        const psicologoId = req.psicologo.id;

        const qUpdate = `
          UPDATE pacientes 
          SET nome = $1, email = $2
          WHERE id = $3 AND psicologo_id = $4
          RETURNING *
        `;
        const result = await db.query(qUpdate, [nome, email, id, psicologoId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Paciente não encontrado ou não pertence a você." });
        }

        res.status(200).json({ message: "Paciente atualizado com sucesso!", paciente: result.rows[0] });

    } catch (error)
 {
        console.error("Erro ao atualizar paciente:", error);
         // Trata erro de violação de chave única (ex: email)
        if (error.code === '23505') { 
            return res.status(409).json({ message: "O email fornecido já está em uso por outro paciente." });
        }
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

/**
 * @route   DELETE /api/pacientes/:id
 * @desc    Deleta UM paciente
 * @access  Private
 */
const deletarPaciente = async (req, res) => {
    try {
        const { id } = req.params;
        const psicologoId = req.psicologo.id;

        const qDelete = 'DELETE FROM pacientes WHERE id = $1 AND psicologo_id = $2 RETURNING *';
        const result = await db.query(qDelete, [id, psicologoId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Paciente não encontrado ou não pertence a você." });
        }

        res.status(200).json({ message: "Paciente deletado com sucesso." });

    } catch (error) {
        console.error("Erro ao deletar paciente:", error);
        // Trata erro de restrição de chave estrangeira (se tiver prontuários)
        if (error.code === '23503') {
            return res.status(409).json({ message: "Não é possível deletar. Paciente possui dados (respostas, resumos) vinculados." });
        }
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};


module.exports = {
  criarPaciente,
  listarPacientes,
  obterPaciente,
  atualizarPaciente,
  deletarPaciente
};

