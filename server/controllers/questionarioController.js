// --- Controlador dos Questionários ---
// Lida com a definição (psicólogo) e busca (paciente) dos questionários

const db = require('../config/db');

// -----------------------------------------------------------------
// MAPA DOS QUESTIONÁRIOS CIENTÍFICOS
// -----------------------------------------------------------------
// Aqui definimos os 3 questionários que o psicólogo pode escolher.
// O frontend enviará a "chave" (ex: "phq_9")
// e nós salvaremos o JSON completo no banco.

const QUESTIONARIOS_CIENTIFICOS = {
    "phq_9": { // Patient Health Questionnaire-9 (Depressão)
        "titulo": "Questionário sobre a Saúde do Paciente (PHQ-9)",
        "instrucao": "Nas últimas 2 semanas, com que frequência você foi incomodado por algum dos problemas abaixo?",
        "opcoes": ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"],
        "perguntas": [
            "1. Pouco interesse ou prazer em fazer as coisas",
            "2. Sentir-se 'para baixo', deprimido(a) ou sem esperança",
            "3. Dificuldade para adormecer ou permanecer adormecido(a), ou dormir mais do que o habitual",
            "4. Sentir-se cansado(a) ou com pouca energia",
            "5. Falta de apetite ou comer mais do que o habitual",
            "6. Sentir-se mal consigo mesmo(a) - ou que você é um fracasso ou que decepcionou a si mesmo(a) ou sua família",
            "7. Dificuldade para se concentrar nas coisas, como ler o jornal ou ver televisão",
            "8. Lentidão para se movimentar ou falar, a ponto de outras pessoas perceberem? Ou o oposto - estar tão agitado(a) ou inquieto(a) que você fica andando de um lado para o outro mais do que o habitual",
            "9. Pensamentos de que seria melhor estar morto(a) ou de se ferir de alguma maneira"
        ]
    },
    "gad_7": { // Generalized Anxiety Disorder-7 (Ansiedade)
        "titulo": "Escala de Transtorno de Ansiedade Generalizada (GAD-7)",
        "instrucao": "Nas últimas 2 semanas, com que frequência você foi incomodado pelos seguintes problemas?",
        "opcoes": ["Nenhuma vez", "Vários dias", "Mais da metade dos dias", "Quase todos os dias"],
        "perguntas": [
            "1. Sentir-se nervoso(a), ansioso(a) ou 'com os nervos à flor da pele'",
            "2. Não ser capaz de parar ou controlar as preocupações",
            "3. Preocupar-se muito sobre diversas coisas",
            "4. Dificuldade para relaxar",
            "5. Estar tão inquieto(a) que é difícil ficar parado(a)",
            "6. Ficar facilmente aborrecido(a) ou irritado(a)",
            "7. Sentir medo, como se algo horrível fosse acontecer"
        ]
    },
    "diario_simples": { // Um diário simples de humor e reflexão
        "titulo": "Diário de Humor e Reflexão",
        "instrucao": "Responda às perguntas abaixo sobre o seu dia de hoje.",
        "opcoes": {}, // Sem opções padrão, as perguntas definem o tipo
        "perguntas": [
            { "id": "humor", "tipo": "escala_1_5", "texto": "Qual seu nível de humor hoje (1 = Muito Ruim, 5 = Muito Bom)?" },
            { "id": "reflexao", "tipo": "texto_longo", "texto": "Descreva sua maior dificuldade ou conquista hoje:" }
        ]
    }
};
// -----------------------------------------------------------------


/**
 * @route   POST /api/pacientes/:id/questionario
 * @desc    (Psicólogo) Cria ou atualiza a config. do questionário de um paciente
 * @access  Private (Psicólogo)
 */
const definirQuestionario = async (req, res) => {
    try {
        const { id: pacienteId } = req.params; // ID do paciente vindo da URL
        const psicologoId = req.psicologo.id; // ID do psicólogo vindo do middleware 'proteger'
        
        // --- NOVAS REGRAS DE NEGÓCIO ---
        const { frequencia_dias, tipo_questionario } = req.body;
        
        // 1. Validação da Frequência (Exatamente 3 dias)
        if (!frequencia_dias || !Array.isArray(frequencia_dias) || frequencia_dias.length !== 3) {
            return res.status(400).json({ message: "É obrigatório selecionar exatamente 3 dias da semana para a frequência." });
        }

        // 2. Validação do Tipo de Questionário
        if (!tipo_questionario || !QUESTIONARIOS_CIENTIFICOS[tipo_questionario]) {
            return res.status(400).json({ 
                message: "Tipo de questionário inválido.",
                opcoes_validas: Object.keys(QUESTIONARIOS_CIENTIFICOS) // ex: ["phq_9", "gad_7", "diario_simples"]
            });
        }

        // 3. Buscar o JSON do questionário com base no tipo
        const perguntas_json = QUESTIONARIOS_CIENTIFICOS[tipo_questionario];
        // --- FIM DAS NOVAS REGRAS ---


        // 4. Verificar se este psicólogo é "dono" do paciente (SEGURANÇA)
        const pacienteQuery = "SELECT * FROM pacientes WHERE id = $1 AND psicologo_id = $2";
        const pacienteResult = await db.query(pacienteQuery, [pacienteId, psicologoId]);

        if (pacienteResult.rows.length === 0) {
            return res.status(404).json({ message: "Paciente não encontrado ou não pertence a este psicólogo." });
        }

        // 5. Criar ou Atualizar (UPSERT) a configuração
        const upsertQuery = `
            INSERT INTO config_questionarios (paciente_id, frequencia_dias, perguntas)
            VALUES ($1, $2, $3)
            ON CONFLICT (paciente_id) 
            DO UPDATE SET
                frequencia_dias = EXCLUDED.frequencia_dias,
                perguntas = EXCLUDED.perguntas
            RETURNING *;
        `;
        
        // Convertemos o JSON de perguntas para string para salvar no DB
        const result = await db.query(upsertQuery, [pacienteId, frequencia_dias, JSON.stringify(perguntas_json)]);

        res.status(201).json({
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
 * @desc    (Paciente) Busca o questionário do dia para o paciente logado
 * @access  Private (Paciente)
 */
const buscarQuestionarioDoDia = async (req, res) => {
    try {
        const pacienteId = req.paciente.id; // ID do paciente vindo do middleware 'protegerPaciente'

        // 1. Descobrir o dia da semana atual (em português)
        // Domingo é 0, Segunda é 1, ..., Sábado é 6
        const diasDaSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        const hoje = diasDaSemana[new Date().getDay()]; // ex: 'terca'

        // 2. Buscar a configuração do questionário
        // Verificamos se 'hoje' está dentro do array 'frequencia_dias'
        const query = `
            SELECT * FROM config_questionarios 
            WHERE paciente_id = $1 AND $2 = ANY(frequencia_dias);
        `;
        
        const result = await db.query(query, [pacienteId, hoje]);

        // 3. Verificar se tem questionário para hoje
        if (result.rows.length === 0) {
            return res.status(200).json({
                temQuestionarioHoje: false,
                message: `Sem questionário para hoje (${hoje}).`
            });
        }

        // 4. (Opcional) Verificar se ele já respondeu hoje (Implementaríamos na Tabela 4)
        // Por agora, vamos apenas enviar as perguntas.

        res.status(200).json({
            temQuestionarioHoje: true,
            configuracao: result.rows[0]
        });

    } catch (error) {
        console.error("Erro ao buscar questionário:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};


module.exports = {
    definirQuestionario,
    buscarQuestionarioDoDia
};

