// --- Controladores de Resumo Semanal (com IA) ---

const db = require('../config/db');
// Importa o 'fetch' que criámos (que usa 'node-fetch')
const { fetch } = require('../utils/fetch');

// Métricas dos questionários (duplicado de relatorioController para consistência)
const METRICAS_QUESTIONARIOS = {
  questionario1: {
    titulo: 'PHQ-9 (Depressão)',
    max_score: 27,
    escala: [
      { intervalo: [0, 4], severidade: 'Mínima', cor: '#10b981' },
      { intervalo: [5, 9], severidade: 'Leve', cor: '#3b82f6' },
      { intervalo: [10, 14], severidade: 'Moderada', cor: '#f59e0b' },
      { intervalo: [15, 19], severidade: 'Moderadamente Grave', cor: '#ef4444' },
      { intervalo: [20, 27], severidade: 'Grave', cor: '#7f1d1d' }
    ]
  },
  questionario2: {
    titulo: 'GAD-7 (Ansiedade)',
    max_score: 21,
    escala: [
      { intervalo: [0, 4], severidade: 'Mínima', cor: '#10b981' },
      { intervalo: [5, 9], severidade: 'Leve', cor: '#3b82f6' },
      { intervalo: [10, 14], severidade: 'Moderada', cor: '#f59e0b' },
      { intervalo: [15, 21], severidade: 'Grave', cor: '#ef4444' }
    ]
  },
  questionario3: {
    titulo: 'PANAS (Afeto)',
    max_score: 100,
    escala: [
      { intervalo: [0, 20], severidade: 'Muito Baixo', cor: '#ef4444' },
      { intervalo: [21, 40], severidade: 'Baixo', cor: '#f59e0b' },
      { intervalo: [41, 60], severidade: 'Moderado', cor: '#3b82f6' },
      { intervalo: [61, 80], severidade: 'Alto', cor: '#10b981' },
      { intervalo: [81, 100], severidade: 'Muito Alto', cor: '#059669' }
    ]
  }
};

/**
 * Calcula a pontuação de um questionário baseado nas respostas
 * Aceita tanto arrays [0,1,2] quanto objetos {q0: 0, q1: 1, ...}
 */
function calcularPontuacao(questionarioKey, respostas) {
  // Converter para array se for objeto
  let respostasArray = respostas;
  
  if (typeof respostas === 'object' && !Array.isArray(respostas)) {
    // É um objeto {q0: 0, q1: 1, ...}
    respostasArray = Object.values(respostas);
  }
  
  if (!Array.isArray(respostasArray) || respostasArray.length === 0) {
    console.log(`⚠️ [calcularPontuacao] Respostas inválidas para ${questionarioKey}:`, respostas);
    return null;
  }
  
  // Soma todas as respostas (valores numéricos)
  const score = respostasArray.reduce((sum, resp) => {
    const valor = parseInt(resp);
    return sum + (isNaN(valor) ? 0 : valor);
  }, 0);
  
  console.log(`✅ [calcularPontuacao] ${questionarioKey}: score = ${score} (respostas: ${JSON.stringify(respostasArray)})`);
  return score;
}

/**
 * Obtém a severidade baseado no score e no questionário
 */
function obterSeveridade(questionarioKey, score) {
  const metricas = METRICAS_QUESTIONARIOS[questionarioKey];
  if (!metricas) return null;
  
  const nivel = metricas.escala.find(e => 
    score >= e.intervalo[0] && score <= e.intervalo[1]
  );
  
  return nivel || null;
}

/**
 * Busca e processa os dados dos questionários da última semana
 */
async function obterDadosQuestionariosSemana(pacienteId) {
  try {
    // Buscar configuração de questionários
    const configResult = await db.query(
      'SELECT * FROM config_questionarios WHERE paciente_id = $1',
      [pacienteId]
    );
    
    if (configResult.rows.length === 0) {
      console.log(`⚠️ [obterDadosQuestionariosSemana] Configuração não encontrada para paciente ${pacienteId}`);
      return {};
    }
    
    const config = configResult.rows[0];
    const configuracao = config.configuracao || [];
    
    // Buscar respostas da última semana
    const umaSemanaAtras = new Date();
    umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);
    
    const respostasResult = await db.query(
      `SELECT * FROM respostas_diarias 
       WHERE paciente_id = $1 AND data_resposta >= $2
       ORDER BY data_resposta DESC`,
      [pacienteId, umaSemanaAtras]
    );
    
    const respostas = respostasResult.rows;
    console.log(`📊 [obterDadosQuestionariosSemana] Paciente ${pacienteId}: ${respostas.length} respostas encontradas`);
    
    // Agrupar respostas por questionário
    const scoresPorQuestionario = {};
    
    configuracao.forEach(config => {
      const qKey = config.questionario;
      scoresPorQuestionario[qKey] = [];
    });
    
    // Processar respostas
    respostas.forEach(resposta => {
      let questionarioId = null;
      let respostasArray = [];
      
      if (typeof resposta.respostas === 'string') {
        try {
          const parsed = JSON.parse(resposta.respostas);
          if (parsed.questionarioId && parsed.respostas) {
            questionarioId = parsed.questionarioId;
            respostasArray = parsed.respostas;
          } else if (Array.isArray(parsed)) {
            respostasArray = parsed;
          } else if (typeof parsed === 'object') {
            // É um objeto {q0: 0, q1: 1, ...}
            respostasArray = parsed;
          }
        } catch (e) {
          console.log(`⚠️ [obterDadosQuestionariosSemana] Erro ao fazer parse: ${e.message}`);
          respostasArray = Array.isArray(resposta.respostas) ? resposta.respostas : [];
        }
      } else if (typeof resposta.respostas === 'object' && resposta.respostas !== null) {
        if (resposta.respostas.questionarioId && resposta.respostas.respostas) {
          questionarioId = resposta.respostas.questionarioId;
          respostasArray = resposta.respostas.respostas;
        } else if (Array.isArray(resposta.respostas)) {
          respostasArray = resposta.respostas;
        } else {
          // É um objeto {q0: 0, q1: 1, ...}
          respostasArray = resposta.respostas;
        }
      }
      
      if (questionarioId && scoresPorQuestionario[questionarioId]) {
        console.log(`✅ [obterDadosQuestionariosSemana] ${questionarioId} encontrado com respostasArray:`, respostasArray);
        scoresPorQuestionario[questionarioId].push(respostasArray);
      } else if (respostasArray && (Array.isArray(respostasArray) || typeof respostasArray === 'object')) {
        // Tentar identificar pelo número de respostas
        const numRespostas = Array.isArray(respostasArray) ? respostasArray.length : Object.keys(respostasArray).length;
        console.log(`🔍 [obterDadosQuestionariosSemana] Identificando por número de respostas: ${numRespostas}`);
        
        if (numRespostas === 9) {
          scoresPorQuestionario['questionario1']?.push(respostasArray);
        } else if (numRespostas === 7) {
          scoresPorQuestionario['questionario2']?.push(respostasArray);
        } else if (numRespostas === 20) {
          scoresPorQuestionario['questionario3']?.push(respostasArray);
        }
      }
    });
    
    // Calcular scores finais
    const questionariosDados = {};
    
    for (const [qKey, respostasArray] of Object.entries(scoresPorQuestionario)) {
      if (respostasArray.length === 0) {
        console.log(`⏭️ [obterDadosQuestionariosSemana] ${qKey}: nenhuma resposta`);
        continue;
      }
      
      console.log(`✅ [obterDadosQuestionariosSemana] ${qKey}: ${respostasArray.length} resposta(s)`);
      
      const metricas = METRICAS_QUESTIONARIOS[qKey];
      if (!metricas) {
        console.log(`❌ [obterDadosQuestionariosSemana] ${qKey}: métrica não encontrada`);
        continue;
      }
      
      // Calcular scores
      const scores = respostasArray.map(r => calcularPontuacao(qKey, r)).filter(s => s !== null);
      const scoreAtual = scores.length > 0 ? scores[scores.length - 1] : 0;
      const scoreMediano = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const scoreMaximo = scores.length > 0 ? Math.max(...scores) : 0;
      const scoreMinimo = scores.length > 0 ? Math.min(...scores) : scoreAtual;
      
      const severidade = obterSeveridade(qKey, scoreAtual);
      
      questionariosDados[qKey] = {
        titulo: metricas.titulo,
        score_atual: scoreAtual,
        score_medio: scoreMediano,
        score_maximo: scoreMaximo,
        score_minimo: scoreMinimo,
        max_possivel: metricas.max_score,
        severidade: severidade?.severidade || 'N/A',
        cor: severidade?.cor || '#gray'
      };
    }
    
    return questionariosDados;
  } catch (error) {
    console.error(`❌ [obterDadosQuestionariosSemana] Erro: ${error.message}`);
    return {};
  }
}

// -----------------------------------------------------------------
// FUNÇÃO DE IA (GEMINI)
// -----------------------------------------------------------------

/**
 * Chama a API do Gemini com um prompt específico
 */
async function chamarGemini(userPrompt, systemPrompt) {
    const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error("[IA] Erro: GOOGLE_AI_API_KEY não encontrada no ficheiro .env");
        return null;
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
        contents: [
            {
                role: "user",
                parts: [{ text: userPrompt }]
            }
        ],
        systemInstruction: {
            role: "system",
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            temperature: 0.7,
        }
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[IA] Erro na API do Gemini: ${response.status} - ${errorBody}`);
            return null;
        }

        const result = await response.json();

        if (!result.candidates || result.candidates.length === 0 || !result.candidates[0].content?.parts?.[0]?.text) {
            console.error("[IA] Erro: A resposta do Gemini veio vazia ou em formato inesperado.", JSON.stringify(result, null, 2));
            return null;
        }
        
        return result.candidates[0].content.parts[0].text.trim();

    } catch (error) {
        console.error("Erro ao chamar Gemini:", error.message);
        return null;
    }
}

/**
 * Gera Resumo Geral da Semana
 */
async function gerarResumoGeral(textoResumo, textoExpectativa, questionariosDados = {}) {
    const systemPrompt = `
        Você é um assistente de psicologia especializado em síntese e análise.
        Sua tarefa é gerar um RESUMO GERAL DA SEMANA (máximo 2-3 parágrafos) que responda a:
        - O que o paciente relatou que respondeu/fez durante a semana
        - Quais foram suas expectativas para a próxima semana
        - Contexto geral: dados dos questionários (scores, tendências)
        
        IMPORTANTE: 
        - Estruture em PARÁGRAFOS SEPARADOS (use quebra de linha entre parágrafos)
        - Cada parágrafo deve ter uma ideia principal clara
        - Use espaçamento entre ideias para melhor legibilidade
        
        Seja conciso, profissional e empático. Escreva em português do Brasil.
    `;

    let userPrompt = `Dados dos Questionários:\n`;
    for (const [key, dados] of Object.entries(questionariosDados)) {
        userPrompt += `- ${dados.titulo}: ${dados.score_atual}/${dados.max_possivel} (${dados.severidade})\n`;
    }

    userPrompt += `\nResumo do Paciente: "${textoResumo}"\n`;
    userPrompt += `Expectativa do Paciente: "${textoExpectativa}"\n\n`;
    userPrompt += `Gere um resumo geral da semana com base nesses dados. Coloque quebra de linha entre parágrafos para melhor legibilidade.`;

    return await chamarGemini(userPrompt, systemPrompt);
}

/**
 * Gera Análise e Pontos de Atenção
 */
async function gerarAnaliseEpontos(textoResumo, textoExpectativa, questionariosDados = {}) {
    const systemPrompt = `
        Você é um psicólogo experiente analisando dados de bem-estar mental.
        Sua tarefa é gerar uma ANÁLISE E PONTOS DE ATENÇÃO (2-4 parágrafos) que incluam:
        - Correlações entre os scores (ex: depressão + ansiedade + afeto)
        - Tendências observadas (melhora, piora, estabilidade)
        - Congruência entre relato verbal e scores
        - Pontos críticos ou de preocupação
        - Recomendações e sugestões
        
        IMPORTANTE:
        - Estruture em PARÁGRAFOS SEPARADOS (use quebra de linha entre parágrafos)
        - Cada parágrafo deve abordar um tópico específico
        - Use espaçamento adequado para melhor legibilidade
        
        Seja analítico, empático e prático. Escreva em português do Brasil como se fosse para orientar o psicólogo.
    `;

    let userPrompt = `Dados dos Questionários:\n`;
    for (const [key, dados] of Object.entries(questionariosDados)) {
        userPrompt += `- ${dados.titulo}: Score ${dados.score_atual}/${dados.max_possivel} (${dados.severidade})\n`;
        userPrompt += `  Médio: ${dados.score_medio}, Variação: ${dados.score_minimo}-${dados.score_maximo}\n`;
    }

    userPrompt += `\nResumo do Paciente: "${textoResumo}"\n`;
    userPrompt += `Expectativa: "${textoExpectativa}"\n\n`;
    userPrompt += `Gere uma análise profunda com pontos de atenção. Use quebra de linha entre parágrafos.`;

    return await chamarGemini(userPrompt, systemPrompt);
}

/**
 * Gera Análise Individual para um Questionário
 */
async function gerarAnaliseQuestionario(questionarioTitulo, score, maxScore, severidade, scoreMedio, scoreMinimo, scoreMaximo) {
    const systemPrompt = `
        Você é um especialista em avaliação psicológica.
        Sua tarefa é gerar uma ANÁLISE INDIVIDUAL (1-2 parágrafos) de UM questionário específico que inclua:
        - Interpretação do score atual em contexto clínico
        - Comparação com a média da semana
        - Tendência (melhora, piora, estável)
        - Significado clínico da severidade
        - Sugestões ou observações relevantes
        
        IMPORTANTE:
        - Estruture em PARÁGRAFOS SEPARADOS (use quebra de linha entre parágrafos)
        - Primeiro parágrafo: análise do score e severidade
        - Segundo parágrafo: tendência e recomendações
        - Use espaçamento para melhor legibilidade
        
        Seja direto, profissional e orientado para ação. Escreva em português do Brasil.
    `;

    const userPrompt = `Questionário: ${questionarioTitulo}
Score Atual: ${score}/${maxScore}
Severidade: ${severidade}
Score Médio da Semana: ${scoreMedio}
Mínimo: ${scoreMinimo}, Máximo: ${scoreMaximo}

Gere uma análise individual detalhada deste questionário. Use quebra de linha entre parágrafos.`;

    return await chamarGemini(userPrompt, systemPrompt);
}

/**
 * Chama a API do Gemini para analisar o texto do paciente com contexto dos questionários.
 * @param {string} textoResumo - O resumo da semana do paciente.
 * @param {string} textoExpectativa - A expectativa do paciente para a próxima semana.
 * @param {object} questionariosDados - Dados dos questionários (scores, severidades).
 * @returns {Promise<object>} - Objeto com análise_geral, análise_pontos, e analises_questionarios.
 */
async function analisarResumoComIA(textoResumo, textoExpectativa, questionariosDados = {}) {
    console.log(`[IA] Iniciando análise com IA...`);

    try {
        // Gerar três análises em paralelo
        const [resumoGeral, analiseEpontos, ...analisesQuestionarios] = await Promise.all([
            gerarResumoGeral(textoResumo, textoExpectativa, questionariosDados),
            gerarAnaliseEpontos(textoResumo, textoExpectativa, questionariosDados),
            ...Object.entries(questionariosDados).map(([key, dados]) =>
                gerarAnaliseQuestionario(
                    dados.titulo,
                    dados.score_atual,
                    dados.max_possivel,
                    dados.severidade,
                    dados.score_medio,
                    dados.score_minimo,
                    dados.score_maximo
                )
            )
        ]);

        const resultado = {
            resumo_geral: resumoGeral,
            analise_pontos: analiseEpontos,
            analises_questionarios: {}
        };

        // Mapear análises dos questionários pelos seus títulos
        const questionariosArray = Object.entries(questionariosDados);
        questionariosArray.forEach(([key, dados], idx) => {
            resultado.analises_questionarios[key] = analisesQuestionarios[idx];
        });

        console.log(`[IA] ✅ Análises geradas com sucesso`);
        return resultado;

    } catch (error) {
        console.error("[IA] Erro ao gerar análises:", error.message);
        return null;
    }
}


// -----------------------------------------------------------------
// CONTROLADOR DE ROTA
// -----------------------------------------------------------------

/**
 * @route   POST /api/resumo/semanal
 * @desc    (Paciente) Salva o resumo semanal com análise de IA incluindo dados dos questionários
 * @access  Privado (Paciente)
 */
const salvarResumoSemanal = async (req, res) => {
    let analises = {
        resumo_geral: null,
        analise_pontos: null,
        analises_questionarios: {}
    };

    try {
        const pacienteId = req.paciente.id; // ID do paciente vindo do token
        const { texto_resumo, texto_expectativa } = req.body;

        // 1. Validação dos campos
        if (!texto_resumo || !texto_expectativa) {
            return res.status(400).json({ message: "Os campos 'texto_resumo' e 'texto_expectativa' são obrigatórios." });
        }
        
        console.log(`📝 [salvarResumoSemanal] Paciente ${pacienteId} submetendo resumo semanal...`);

        // 2. Buscar dados dos questionários da semana
        console.log(`🔍 [salvarResumoSemanal] Buscando dados dos questionários...`);
        const questionariosDados = await obterDadosQuestionariosSemana(pacienteId);
        console.log(`📊 [salvarResumoSemanal] Questionários encontrados: ${Object.keys(questionariosDados).length}`);

        // 3. Chamar a IA (Gemini) para gerar 3 análises separadas
        console.log(`[IA] Chamando Gemini para gerar análises do paciente ID: ${pacienteId}...`);
        const resultado = await analisarResumoComIA(texto_resumo, texto_expectativa, questionariosDados);

        if (!resultado) {
            console.warn(`[IA] Análise do Gemini falhou. Salvando resumo sem ela.`);
        } else {
            console.log(`[IA] ✅ Análises geradas com sucesso!`);
            analises = resultado;
        }

        // 4. Salvar no banco com as 3 análises
        const query = `
            INSERT INTO resumos_semanais 
                (paciente_id, data_fim_semana, texto_resumo, texto_expectativa, analise_ia, resumo_geral, analise_pontos, analises_questionarios)
            VALUES 
                ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        
        // Usar a análise de pontos como analise_ia para compatibilidade
        const values = [
            pacienteId,
            texto_resumo,
            texto_expectativa,
            analises.analise_pontos || null, // Retrocompatibilidade
            analises.resumo_geral || null,
            analises.analise_pontos || null,
            JSON.stringify(analises.analises_questionarios) // Salvar como JSON
        ];
        
        const result = await db.query(query, values);

        res.status(201).json({
            message: "Resumo semanal enviado com sucesso!",
            resumo: result.rows[0]
        });

    } catch (error) {
        console.error("❌ Erro ao salvar resumo semanal:", error);
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

module.exports = {
    salvarResumoSemanal
};