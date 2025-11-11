const db = require('../config/db');

// Função de utilitário para obter o dia da semana em 'pt-BR'
// IMPORTANTE: Sempre usar timezone América/São Paulo para consistência
function getDayOfWeek(date = new Date()) {
    const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    
    // Converter para string em timezone Brasil (DD/MM/YYYY)
    const dateStr = date.toLocaleString("pt-BR", {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: "America/Sao_Paulo"
    });
    
    console.log(`🕐 [getDayOfWeek] Input ISO: ${date?.toISOString?.() || date}`);
    console.log(`🕐 [getDayOfWeek] Locale PT-BR: "${dateStr}"`);
    
    // Parse DD/MM/YYYY
    const [dia, mes, ano] = dateStr.split('/');
    const diaNum = parseInt(dia);
    const mesNum = parseInt(mes);
    const anoNum = parseInt(ano);
    
    // Usar o próprio método getDay() mas com a data corretamente construída
    // Criar um Date UTC em vez de local para evitar problemas de timezone do servidor
    const dateUTC = new Date(Date.UTC(anoNum, mesNum - 1, diaNum));
    const dayIndex = dateUTC.getUTCDay();
    
    console.log(`🕐 [getDayOfWeek] Parseado: ${diaNum}/${mesNum}/${anoNum}, UTC Date: ${dateUTC.toISOString()}, getUTCDay()=${dayIndex}, Dia: ${days[dayIndex]}`);
    
    return days[dayIndex];
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
        "titulo": "Escala de Afeto Positivo e Negativo (PANAS)",
        "tipo": "escala",
        "opcoes": ["Nada", "Um pouco", "Moderadamente", "Bastante", "Extremamente"],
        "perguntas": [
            "1. Interessado(a)",
            "2. Angustiado(a)",
            "3. Excitado(a)",
            "4. Culpado(a)",
            "5. Assustado(a)",
            "6. Entusiasmado(a)",
            "7. Hostil",
            "8. Orgulhoso(a)",
            "9. Irritado(a)",
            "10. Inspirado(a)",
            "11. Nervoso(a)",
            "12. Determinado(a)",
            "13. Atento(a)",
            "14. Apreensivo(a)",
            "15. Ativo(a)",
            "16. Tímido(a)",
            "17. Assombrado(a)",
            "18. Alerta(a)",
            "19. Envergonhado(a)",
            "20. Animado(a)"
        ]
    }
};

/**
 * @route   POST /api/pacientes/:id/questionario
 * @desc    (Psicólogo) Define ou atualiza a configuração do questionário de um paciente
 *          Suporta o novo payload 'configuracao_questionarios' (array de 3 objetos { diaId, questionarioId })
 * @access  Privado (Psicólogo)
 */
const definirQuestionario = async (req, res) => {
    try {
        const { id: pacienteId } = req.params;
        const psicologoId = req.psicologo.id;
        const { configuracao_questionarios, frequencia_dias, tipo_questionario } = req.body;

        // 1. Verificar propriedade do paciente
        const pacienteResult = await db.query(
            'SELECT * FROM pacientes WHERE id = $1 AND psicologo_id = $2', 
            [pacienteId, psicologoId]
        );
        if (pacienteResult.rows.length === 0) {
            return res.status(404).json({ message: "Paciente não encontrado ou não pertence a este psicólogo." });
        }

        // Helper: map numeric diaId (1-7) para nome em português compatível com getDayOfWeek
        const diaIdParaNome = (id) => {
            const mapa = {
                1: 'segunda',
                2: 'terca',
                3: 'quarta',
                4: 'quinta',
                5: 'sexta',
                6: 'sabado',
                7: 'domingo'
            };
            return mapa[id] || null;
        };

        // Se foi enviado o novo formato 'configuracao_questionarios'
        let configuracaoToStore = null;
        if (configuracao_questionarios) {
            console.log('📋 configuracao_questionarios recebida:', JSON.stringify(configuracao_questionarios, null, 2));
            
            if (!Array.isArray(configuracao_questionarios) || configuracao_questionarios.length !== 3) {
                return res.status(400).json({ message: "'configuracao_questionarios' deve ser um array com exatamente 3 itens." });
            }

            // Validar itens e construir estrutura com nomes de dia e chave do questionário
            configuracaoToStore = configuracao_questionarios.map(item => {
                const diaNome = item.dia && typeof item.dia === 'string' ? item.dia : diaIdParaNome(item.diaId);
                const qId = item.questionarioId || item.questionario;
                // Map numeric questionarioId (1/2/3) para keys do mapa QUESTIONARIOS_CIENTIFICOS
                const qKey = qId === 1 ? 'questionario1' : qId === 2 ? 'questionario2' : qId === 3 ? 'questionario3' : (typeof qId === 'string' ? qId : null);

                console.log(`  📌 Item: diaId=${item.diaId} -> "${diaNome}", questionarioId=${qId} -> "${qKey}"`);

                if (!diaNome || !qKey || !QUESTIONARIOS_CIENTIFICOS[qKey]) {
                    throw new Error('Item inválido em configuracao_questionarios. Cada item deve ter diaId (1-7) e questionarioId (1-3).');
                }

                return { dia: diaNome, questionario: qKey };
            });
            console.log('✅ Configuração a salvar:', JSON.stringify(configuracaoToStore, null, 2));
        }

        // Para compatibilidade com payload antigo, se fornecido, use frequencia_dias + tipo_questionario
        if (!configuracaoToStore && frequencia_dias && tipo_questionario) {
            if (!Array.isArray(frequencia_dias) || frequencia_dias.length !== 3) {
                return res.status(400).json({ message: "É obrigatório enviar um array 'frequencia_dias' com exatamente 3 dias da semana (ex: ['segunda','quarta','sexta'])." });
            }
            if (!QUESTIONARIOS_CIENTIFICOS[tipo_questionario]) {
                return res.status(400).json({ message: 'Tipo de questionário inválido.' });
            }

            configuracaoToStore = frequencia_dias.map(d => ({ dia: d, questionario: tipo_questionario }));
        }

        if (!configuracaoToStore) {
            return res.status(400).json({ message: "Payload inválido. Envie 'configuracao_questionarios' ou ('frequencia_dias' e 'tipo_questionario')." });
        }

        // Montar um objeto 'perguntas' consolidado por dia (para facilitar retorno ao paciente)
        const perguntasPorDia = {};
        configuracaoToStore.forEach(cfg => {
            perguntasPorDia[cfg.dia] = QUESTIONARIOS_CIENTIFICOS[cfg.questionario];
        });

        // Salvar no banco (UPSERT) — adicionamos nova coluna 'configuracao' (JSONB) e mantemos frequencia_dias para compatibilidade
        const frequenciaDiasArray = configuracaoToStore.map(c => c.dia);

        const upsertQuery = `
            INSERT INTO config_questionarios (paciente_id, frequencia_dias, tipo_questionario, perguntas, configuracao)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (paciente_id)
            DO UPDATE SET
                frequencia_dias = EXCLUDED.frequencia_dias,
                tipo_questionario = EXCLUDED.tipo_questionario,
                perguntas = EXCLUDED.perguntas,
                configuracao = EXCLUDED.configuracao
            RETURNING id, paciente_id, frequencia_dias, tipo_questionario, configuracao;
        `;

        // tipo_questionario: deixamos nulo quando usamos per-day config
        const tipoParaSalvar = configuracaoToStore[0] ? configuracaoToStore[0].questionario : null;
        const values = [pacienteId, frequenciaDiasArray, tipoParaSalvar, JSON.stringify(perguntasPorDia), JSON.stringify(configuracaoToStore)];
        const result = await db.query(upsertQuery, values);

        res.status(200).json({ message: 'Questionário configurado com sucesso!', configuracao: result.rows[0] });

    } catch (error) {
        console.error('Erro ao definir questionário:', error);
        res.status(500).json({ message: 'Erro interno no servidor.', details: error.message });
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
        const isTestMode = req.headers['x-test-mode'] === 'true';
        let dataConsulta = new Date();

        // Se estiver em modo de teste e uma data foi fornecida, use-a
        if (isTestMode && req.query.test_date) {
            // IMPORTANTE: req.query.test_date vem como "YYYY-MM-DD" em Brasil timezone
            // Criar um Date que represente meia-noite em São Paulo nessa data
            // Estratégia: criar UTC e depois ajustar para diferença horária
            const [ano, mes, dia] = req.query.test_date.split('-');
            // Meia-noite em São Paulo = 3 horas depois em UTC (GMT-3)
            // Então criamos um Date UTC que quando interpretado como Brasil dá essa data
            dataConsulta = new Date(Date.UTC(ano, parseInt(mes) - 1, dia, 3, 0, 0));
            console.log(`🕐 [buscarQuestionarioDoDia] Teste: Parse date "${req.query.test_date}" -> ${dataConsulta.toISOString()} (meia-noite em SP)`);
        }

        const diaDaSemana = getDayOfWeek(dataConsulta);
        console.log(`🔍 [buscarQuestionarioDoDia] Data: ${dataConsulta.toISOString()}, Dia da semana: ${diaDaSemana}`);

        // Buscar configuração do paciente (única por paciente)
        const query = `SELECT * FROM config_questionarios WHERE paciente_id = $1 LIMIT 1;`;
        const result = await db.query(query, [pacienteId]);
        if (result.rows.length === 0) {
            console.log(`⚠️ [buscarQuestionarioDoDia] Paciente ${pacienteId} sem configuração`);
            return res.status(200).json({ temQuestionarioHoje: false, message: 'Sem questionário para hoje.' });
        }

        const configuracao = result.rows[0];
        console.log(`📋 [buscarQuestionarioDoDia] Configuração do paciente:`, JSON.stringify(configuracao.configuracao, null, 2));

        // Procurar na 'configuracao' (JSONB) o entry que corresponda ao diaDaSemana
        const configJson = configuracao.configuracao || null;
        let encontrado = null;
        if (configJson && Array.isArray(configJson)) {
            console.log(`🔎 [buscarQuestionarioDoDia] Procurando por dia: "${diaDaSemana}" em:`, configJson.map(c => c.dia));
            encontrado = configJson.find(c => c.dia === diaDaSemana);
        }

        // Se não encontrar por 'configuracao', fazer fallback para frequencia_dias (compatibilidade)
        if (!encontrado && configuracao.frequencia_dias && Array.isArray(configuracao.frequencia_dias) && configuracao.frequencia_dias.includes(diaDaSemana)) {
            // usar tipo_questionario como chave
            encontrado = { dia: diaDaSemana, questionario: configuracao.tipo_questionario };
            console.log(`✅ [buscarQuestionarioDoDia] Encontrado via fallback (frequencia_dias)`);
        }

        if (!encontrado) {
            console.log(`❌ [buscarQuestionarioDoDia] Nenhum questionário encontrado para ${diaDaSemana}`);
            return res.status(200).json({ temQuestionarioHoje: false, message: 'Nenhum questionário para hoje.' });
        }

        console.log(`✅ [buscarQuestionarioDoDia] Questionário encontrado:`, encontrado);

        // Verificar se o paciente já respondeu no dia em questão
        const queryJaRespondeu = `SELECT * FROM respostas_diarias WHERE paciente_id = $1 AND data_resposta::date = $2;`;
        const respostaHoje = await db.query(queryJaRespondeu, [pacienteId, dataConsulta.toISOString().split('T')[0]]);
        if (respostaHoje.rows.length > 0 && !isTestMode) {
            console.log(`⚠️ [buscarQuestionarioDoDia] Paciente ${pacienteId} já respondeu hoje`);
            return res.status(200).json({ temQuestionarioHoje: false, message: 'Você já enviou a sua resposta de hoje.' });
        }

        // Preparar o questionário a partir da chave encontrada
        const questionarioChave = encontrado.questionario;
        const questionarioObj = QUESTIONARIOS_CIENTIFICOS[questionarioChave];

        res.status(200).json({ 
            temQuestionarioHoje: true, 
            id: questionarioChave,
            titulo: questionarioObj.titulo,
            nome: questionarioObj.titulo,
            descricao: 'Responda todas as perguntas abaixo.',
            opcoes: questionarioObj.opcoes,
            perguntas: questionarioObj.perguntas,
            isTestMode, 
            dataConsulta: dataConsulta.toISOString().split('T')[0] 
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
        const { respostas, dataResposta } = req.body;
        const isTestMode = req.headers['x-test-mode'] === 'true';

        console.log(`📝 [salvarRespostaDiaria] Paciente ${pacienteId}, dataResposta=${dataResposta}, isTestMode=${isTestMode}`);

        if (!respostas) {
            return res.status(400).json({ 
                message: "O campo 'respostas' (contendo o JSON das respostas) é obrigatório." 
            });
        }
        
        // Determinar a data a ser usada na verificação
        let dataParaVerificacao = new Date().toISOString().split('T')[0];
        let dataConsulta = new Date();
        
        if (isTestMode && dataResposta) {
            // dataResposta vem como "YYYY-MM-DD" em Brasil timezone
            dataParaVerificacao = dataResposta;
            // Criar um Date que represente meia-noite em São Paulo nessa data
            const [ano, mes, dia] = dataResposta.split('-');
            // Meia-noite em São Paulo = 3 horas depois em UTC (GMT-3)
            dataConsulta = new Date(Date.UTC(ano, parseInt(mes) - 1, dia, 3, 0, 0));
            console.log(`🕐 [salvarRespostaDiaria] Teste: Parse date "${dataResposta}" -> ${dataConsulta.toISOString()} (meia-noite em SP)`);
        }

        // Determinar o dia da semana da data
        const diaDaSemana = getDayOfWeek(dataConsulta);
        console.log(`📅 [salvarRespostaDiaria] Data: ${dataConsulta.toISOString()}, Dia: ${diaDaSemana}`);

        // Verificar se o paciente tem questionário configurado para este dia
        const configQuery = `SELECT * FROM config_questionarios WHERE paciente_id = $1 LIMIT 1;`;
        const configResult = await db.query(configQuery, [pacienteId]);
        
        if (configResult.rows.length === 0) {
            return res.status(403).json({
                message: "Nenhum questionário configurado para você."
            });
        }

        const configuracao = configResult.rows[0];
        const configJson = configuracao.configuracao || null;
        let temQuestionarioNoDia = false;

        console.log(`📋 [salvarRespostaDiaria] Configuração:`, JSON.stringify(configJson, null, 2));

        if (configJson && Array.isArray(configJson)) {
            temQuestionarioNoDia = configJson.some(c => c.dia === diaDaSemana);
            console.log(`🔍 [salvarRespostaDiaria] Verificando se "${diaDaSemana}" está em:`, configJson.map(c => c.dia));
        } else if (configuracao.frequencia_dias && Array.isArray(configuracao.frequencia_dias)) {
            temQuestionarioNoDia = configuracao.frequencia_dias.includes(diaDaSemana);
        }

        if (!temQuestionarioNoDia) {
            console.log(`❌ [salvarRespostaDiaria] Dia ${diaDaSemana} não configurado!`);
            return res.status(403).json({
                message: "Não há questionário configurado para este dia da semana."
            });
        }
        
        console.log(`✅ [salvarRespostaDiaria] Dia ${diaDaSemana} encontrado na configuração!`);

        // Verificar se o paciente já respondeu hoje (apenas se não estiver em modo de teste)
        if (!isTestMode) {
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
        } else {
            // Em modo de teste, verificar na data específica
            const queryJaRespondeu = `
                SELECT * FROM respostas_diarias 
                WHERE paciente_id = $1 AND data_resposta::date = $2;
            `;
            const respostaHoje = await db.query(queryJaRespondeu, [pacienteId, dataParaVerificacao]);
            
            if (respostaHoje.rows.length > 0) {
                return res.status(409).json({
                    message: "Você já enviou a sua resposta neste dia (modo teste)."
                });
            }
        }

        // Salvar no banco
        const query = `
            INSERT INTO respostas_diarias (paciente_id, respostas, data_resposta)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;

        const values = [
            pacienteId,
            JSON.stringify(respostas),
            isTestMode && dataResposta ? dataResposta : new Date()
        ];
        const result = await db.query(query, values);

        // Após salvar, verificar se este envio completa o ciclo de questionários da semana
        // Buscar configuração do paciente
        const cfgRes = await db.query('SELECT * FROM config_questionarios WHERE paciente_id = $1 LIMIT 1;', [pacienteId]);
        let numeroQuestionariosSemana = 3; // default
        if (cfgRes.rows.length > 0) {
            const cfg = cfgRes.rows[0];
            if (cfg.configuracao && Array.isArray(cfg.configuracao)) numeroQuestionariosSemana = cfg.configuracao.length;
            else if (cfg.frequencia_dias && Array.isArray(cfg.frequencia_dias)) numeroQuestionariosSemana = cfg.frequencia_dias.length;
        }

        // Contar respostas do paciente na mesma semana (usamos week number + year para agrupar)
        const countQuery = `
            SELECT COUNT(*) FROM respostas_diarias
            WHERE paciente_id = $1
              AND date_part('week', data_resposta) = date_part('week', CURRENT_DATE)
              AND date_part('year', data_resposta) = date_part('year', CURRENT_DATE)
        `;
        const countRes = await db.query(countQuery, [pacienteId]);
        const respostasEstaSemana = Number(countRes.rows[0].count || 0);

        const resumoNecessario = respostasEstaSemana === numeroQuestionariosSemana;

        res.status(201).json({
            message: 'Resposta enviada com sucesso!',
            resposta: result.rows[0],
            resumoNecessario
        });

    } catch (error) {
        console.error("Erro ao salvar resposta diária:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

/**
 * @route   POST /api/questionario/reiniciar
 * @desc    (Paciente - Modo Teste) Reinicia todos os questionários do paciente
 * @access  Privado (Paciente)
 */
const reiniciarQuestionarios = async (req, res) => {
    try {
        const pacienteId = req.paciente.id;

        // Deletar todas as respostas do paciente
        const deleteQuery = `DELETE FROM respostas_diarias WHERE paciente_id = $1`;
        await db.query(deleteQuery, [pacienteId]);

        res.status(200).json({ 
            message: "Questionários reiniciados com sucesso!"
        });

    } catch (error) {
        console.error("Erro ao reiniciar questionários:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

// EXPORTAÇÃO com LOG DE DEBUG
console.log('🔍 [questionarioController.js] Verificando funções antes de exportar:');
console.log('   definirQuestionario:', typeof definirQuestionario);
console.log('   buscarQuestionarioDoDia:', typeof buscarQuestionarioDoDia);
console.log('   salvarRespostaDiaria:', typeof salvarRespostaDiaria);
console.log('   reiniciarQuestionarios:', typeof reiniciarQuestionarios);

module.exports = {
    definirQuestionario,
    buscarQuestionarioDoDia,
    salvarRespostaDiaria,
    reiniciarQuestionarios
};

console.log('✅ [questionarioController.js] Funções exportadas com sucesso!');