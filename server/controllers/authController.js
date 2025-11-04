const db = require('../config/db'); // Importa sua conexão com o banco
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * @route   POST /api/auth/registrar
 * @desc    Registra um novo psicólogo
 * @access  Public
 */
const registrar = async (req, res) => {
  try {
    const { nome, email, senha, crp } = req.body;

    // 1. Validar se os campos obrigatórios foram enviados
    if (!nome || !email || !senha || !crp) {
      return res.status(400).json({ message: "Por favor, preencha todos os campos obrigatórios (nome, email, senha, crp)." });
    }

    // 2. Verificar se o email ou CRP já existem (usando seu schema.sql)
    const queryVerifica = 'SELECT * FROM psicologos WHERE email = $1 OR crp = $2';
    const { rows: psicologosExistentes } = await db.query(queryVerifica, [email, crp]);

    if (psicologosExistentes.length > 0) {
        if (psicologosExistentes[0].email === email) {
            return res.status(409).json({ message: "Este email já está cadastrado." });
        }
        if (psicologosExistentes[0].crp === crp) {
            return res.status(409).json({ message: "Este CRP já está cadastrado." });
        }
    }

    // 3. Criptografar a senha (Hashing)
    const salt = await bcrypt.genSalt(10);
    // Usando 'senha_hash' como no seu schema.sql
    const senhaHash = await bcrypt.hash(senha, salt); 

    // 4. Criar o novo psicólogo no banco de dados
    const queryInsere = 'INSERT INTO psicologos (nome, email, senha_hash, crp) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, crp, created_at';
    const { rows: novoPsicologoRows } = await db.query(queryInsere, [nome, email, senhaHash, crp]);
    const novoPsicologo = novoPsicologoRows[0];
    
    // 5. Enviar a resposta de sucesso
    res.status(201).json({
      message: "Psicólogo registrado com sucesso!",
      psicologo: novoPsicologo,
    });

  } catch (error) {
    console.error("Erro ao registrar psicólogo:", error);
    res.status(500).json({ message: "Erro interno no servidor." });
  }
};


/**
 * @route   POST /api/auth/login
 * @desc    Autentica um psicólogo e retorna um token
 * @access  Public
 */
const login = async (req, res) => {
    try {
      const { email, senha } = req.body;
  
      // 1. Validar a entrada
      if (!email || !senha) {
        return res.status(400).json({ message: "Email e senha são obrigatórios." });
      }

      // 2. Verificar se o psicólogo existe pelo email
      const queryBusca = 'SELECT * FROM psicologos WHERE email = $1';
      const { rows: psicologoRows } = await db.query(queryBusca, [email]);

      if (psicologoRows.length === 0) {
        // Mensagem genérica por segurança
        return res.status(401).json({ message: "Email ou senha inválidos." });
      }

      const psicologo = psicologoRows[0];
  
      // 3. Comparar a senha enviada com o hash salvo no banco (coluna 'senha_hash')
      const senhaCorreta = await bcrypt.compare(senha, psicologo.senha_hash);
  
      if (!senhaCorreta) {
        // Mensagem genérica por segurança
        return res.status(401).json({ message: "Email ou senha inválidos." });
      }
  
      // 4. Gerar o Token JWT
      const token = jwt.sign(
        { id: psicologo.id, email: psicologo.email, crp: psicologo.crp }, 
        process.env.JWT_SECRET, // (Certifique-se de ter 'JWT_SECRET' no seu .env)
        { expiresIn: '8h' } 
      );
  
      // 5. Remover a senha da resposta antes de enviar
      delete psicologo.senha_hash;
  
      // 6. Enviar o token e os dados do usuário
      res.status(200).json({
        message: "Login realizado com sucesso!",
        token: token,
        psicologo: psicologo,
      });
  
    } catch (error) {
      console.error("Erro no login:", error);
      res.status(500).json({ message: "Erro interno no servidor." });
    }
  };

// Exporta as funções no formato CommonJS
module.exports = {
    registrar,
    login
};

