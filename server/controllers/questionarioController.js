const db = require('../config/db');

// Função de utilitário para obter o dia da semana em 'pt-BR'
function getDayOfWeek() {
    const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const now = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    return days[now.getDay()];
}

// MAPA DOS QUESTIONÁRIOS CIENTÍFICOS
const QUESTIONARIOS_CIENTIFICOS = {
    "questionario1": {
        "titulo": "Questionário sobre a Saúde do Paciente (PHQ-9)",
        "tipo": "escala", 
        "opcoes": ["Nenhuma vez", "Vários dias", "Mais de metade dos dias", "Quase todos os dias"],
        "perguntas": [
            "1. Pouco interesse ou prazer em fazer as coisas",
            "2. Sentir-se em baixo, deprimido(a) ou sem esperança",
            "3. Dificuldade em adormecer ou em permanecer a dormir, ou dormir demasiado",
            "4. Sentir-se cansado(a) ou com pouca energia",
            "5. Falta de apetite ou comer demasiado",
            "6. Sentir-se mal consigo mesmo(a) - ou que é um falhado(a) ou que desiludiu-se a si ou à sua família",
            "7. Dificuldade em concentrar-se nas coisas, como ler o jornal ou ver televisão",
            "8. Mover-se ou falar tão lentamente que outras pessoas poderiam ter notado? Ou o oposto - estar tão agitado(a) ou irrequieto(a) que se mexe muito mais do que o habitual",
            "9. Pensamentos de que seria melhor estar morto(a) ou de se ferir de alguma maneira"
        ]
    },
    "questionario2": {
        "titulo": "Escala de Transtorno de Ansiedade Generalizada (GAD-7)",
        "tipo": "escala", 
        "opcoes": ["Nenhuma vez", "Vários dias", "Mais de metade dos dias", "Quase todos os dias"],
        "perguntas": [
            "1. Sentir-se nervoso(a), ansioso(a) ou no limite",
            "2. Não ser capaz de parar ou controlar as preocupações",
            "3. Preocupar-se demasiado com coisas diferentes",
            "4. Dificuldade em relaxar",
            "5. Estar tão irrequieto(a) que é difícil ficar parado(a)",
            "6. Ficar facilmente aborrecido(a) ou irritável",
            "7. Sentir medo, como se algo horrível fosse acontecer"
        ]
    },
    "questionario3": {
        "titulo": "Diário de Humor e Reflexão",
        "tipo": "misto",
        "perguntas": [
            { "id": "nota_humor", "texto": "Qual seu nível de humor (1-5)?", "tipo": "numero" },
            { "id": "reflexao_texto", "texto": "Descreva brevemente como se sentiu hoje:", "tipo": "texto_longo" }
        ]
    }
};

/**
 * @route   POST /api/pacientes/:id/questionario
 * @desc    (Psicólogo) Define ou atualiza a configuração do questionário de um paciente
 * @access  Privado (Psicólogo)
 */
const definirQuestionario = async (req, res) => {
    try {
        const { id: pacienteId } = req.params;
        const psicologoId = req.psicologo.id;
        const { frequencia_dias, tipo_questionario } = req.body;

        // 1. Validação da Frequência
        if (!frequencia_dias || !Array.isArray(frequencia_dias) || frequencia_dias.length !== 3) {
            return res.status(400).json({ 
                message: "É obrigatório enviar um array 'frequencia_dias' com exatamente 3 dias da semana (ex: ['segunda', 'quarta', 'sexta'])." 
            });
        }

        // 2. Validação do Tipo de Questionário
        if (!tipo_questionario || !QUESTIONARIOS_CIENTIFICOS[tipo_questionario]) {
            return res.status(400).json({ 
                message: "Tipo de questionário inválido.",
                opcoes_validas: Object.keys(QUESTIONARIOS_CIENTIFICOS)
            });
        }

        // 3. Verificar se o psicólogo é dono deste paciente
        const pacienteResult = await db.query(
            'SELECT * FROM pacientes WHERE id = $1 AND psicologo_id = $2', 
            [pacienteId, psicologoId]
        );
        
        if (pacienteResult.rows.length === 0) {
            return res.status(404).json({ 
                message: "Paciente não encontrado ou não pertence a este psicólogo." 
            });
        }

        // 4. Pegar o JSON completo do questionário
        const perguntasJSON = QUESTIONARIOS_CIENTIFICOS[tipo_questionario];

        // 5. Salvar no banco (UPSERT)
        const upsertQuery = `
            INSERT INTO config_questionarios (paciente_id, frequencia_dias, tipo_questionario, perguntas)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (paciente_id) 
            DO UPDATE SET 
                frequencia_dias = EXCLUDED.frequencia_dias,
                tipo_questionario = EXCLUDED.tipo_questionario,
                perguntas = EXCLUDED.perguntas
            RETURNING id, paciente_id, frequencia_dias, tipo_questionario;
        `;
        
        const values = [pacienteId, frequencia_dias, tipo_questionario, JSON.stringify(perguntasJSON)];
        const result = await db.query(upsertQuery, values);

        res.status(200).json({
            message: "Questionário configurado com sucesso!",
            configuracao: result.rows[0]
        });

    } catch (error) {
        console.error("Erro ao definir questionário:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

/**
 * @route   GET /api/questionario/hoje
 * @desc    (Paciente) Busca o questionário definido para o dia de hoje
 * @access  Privado (Paciente)
 */
const buscarQuestionarioDoDia = async (req, res) => {
    try {
        const pacienteId = req.paciente.id;
        const diaDaSemana = getDayOfWeek(); 

        const query = `
            SELECT * FROM config_questionarios 
            WHERE paciente_id = $1 AND $2 = ANY(frequencia_dias);
        `;
        const result = await db.query(query, [pacienteId, diaDaSemana]);

        if (result.rows.length === 0) {
            return res.status(200).json({
                temQuestionarioHoje: false,
                message: "Sem questionário para hoje."
            });
        }
        
        const configuracao = result.rows[0];
        
        // Verificar se o paciente já respondeu hoje
        const queryJaRespondeu = `
            SELECT * FROM respostas_diarias 
            WHERE paciente_id = $1 AND data_resposta::date = CURRENT_DATE;
        `;
        const respostaHoje = await db.query(queryJaRespondeu, [pacienteId]);
        
        if (respostaHoje.rows.length > 0) {
            return res.status(200).json({
                temQuestionarioHoje: false, 
                message: "Você já enviou a sua resposta de hoje."
            });
        }

        res.status(200).json({
            temQuestionarioHoje: true,
            questionario: configuracao.perguntas
        });

    } catch (error) {
        console.error("Erro ao buscar questionário do dia:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

/**
 * @route   POST /api/questionario/responder
 * @desc    (Paciente) Salva as respostas do questionário diário
 * @access  Privado (Paciente)
 */
const salvarRespostaDiaria = async (req, res) => {
    try {
        const pacienteId = req.paciente.id;
        const { respostas } = req.body;

        if (!respostas) {
            return res.status(400).json({ 
                message: "O campo 'respostas' (contendo o JSON das respostas) é obrigatório." 
            });
        }
        
        // Verificar se o paciente já respondeu hoje
        const queryJaRespondeu = `
            SELECT * FROM respostas_diarias 
            WHERE paciente_id = $1 AND data_resposta::date = CURRENT_DATE;
        `;
        const respostaHoje = await db.query(queryJaRespondeu, [pacienteId]);
        
        if (respostaHoje.rows.length > 0) {
            return res.status(409).json({
                message: "Você já enviou a sua resposta de hoje."
            });
        }

        // Salvar no banco
        const query = `
            INSERT INTO respostas_diarias (paciente_id, respostas)
            VALUES ($1, $2)
            RETURNING *;
        `;
        
        const values = [pacienteId, JSON.stringify(respostas)];
        const result = await db.query(query, values);

        res.status(201).json({
            message: "Resposta enviada com sucesso!",
            resposta: result.rows[0]
        });

    } catch (error) {
        console.error("Erro ao salvar resposta diária:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

// EXPORTAÇÃO com LOG DE DEBUG
console.log('🔍 [questionarioController.js] Verificando funções antes de exportar:');
console.log('   definirQuestionario:', typeof definirQuestionario);
console.log('   buscarQuestionarioDoDia:', typeof buscarQuestionarioDoDia);
console.log('   salvarRespostaDiaria:', typeof salvarRespostaDiaria);

module.exports = {
    definirQuestionario,
    buscarQuestionarioDoDia,
    salvarRespostaDiaria
};

console.log('✅ [questionarioController.js] Funções exportadas com sucesso!');