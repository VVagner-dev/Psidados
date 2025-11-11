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
 * Chama a API do Gemini para analisar o texto do paciente com contexto dos questionários.
 * @param {string} textoResumo - O resumo da semana do paciente.
 * @param {string} textoExpectativa - A expectativa do paciente para a próxima semana.
 * @param {object} questionariosDados - Dados dos questionários (scores, severidades).
 * @returns {Promise<string>} - A análise gerada pela IA.
 */
async function analisarResumoComIA(textoResumo, textoExpectativa, questionariosDados = {}) {
    // 1. Obter a Chave da API do .env
    const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error("[IA] Erro: GOOGLE_AI_API_KEY não encontrada no ficheiro .env");
        return null;
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

    // 2. O Prompt (construir com dados dos questionários)
    const systemPrompt = `
        Aja como um assistente de psicologia. 
        Você receberá:
        - Dados de questionários de saúde mental (PHQ-9 para depressão, GAD-7 para ansiedade, PANAS para afeto)
        - Um resumo da semana que passou do paciente
        - Expectativas do paciente para a próxima semana
        
        A sua tarefa é gerar uma análise profissional e empática (2-3 parágrafos) para o psicólogo deste paciente.
        
        O que analisar:
        - Os scores dos questionários e suas severidades
        - Correlações entre os dados dos questionários (ex: alta ansiedade + baixo afeto)
        - O sentimento principal do resumo semanal
        - Temas-chave mencionados pelo paciente
        - Congruência entre os scores e o relato escrito (se há desconexão)
        - Se a expectativa para a próxima semana é realista dado o contexto
        
        Responda em português do Brasil, num tom profissional mas empático, como se fosse para um psicólogo ler.
    `;

    // 3. Construir o texto do utilizador com dados dos questionários
    let userPrompt = ``;
    
    if (Object.keys(questionariosDados).length > 0) {
        userPrompt += `**Dados dos Questionários desta Semana:**\n`;
        for (const [key, dados] of Object.entries(questionariosDados)) {
            userPrompt += `
- ${dados.titulo}: Score ${dados.score_atual}/${dados.max_possivel} (${dados.severidade})
  - Score médio da semana: ${dados.score_medio}
  - Variação: ${dados.score_minimo} a ${dados.score_maximo}
`;
        }
        userPrompt += `\n`;
    }
    
    userPrompt += `**Resumo da Semana:**
"${textoResumo}"

**Expectativa para a Próxima Semana:**
"${textoExpectativa}"`;

    console.log(`[IA] Preparando análise com dados de ${Object.keys(questionariosDados).length} questionários`);

    // 4. Montar a Requisição
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

    // 5. Chamar a API
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

        // 6. Extrair o texto da resposta da IA
        if (!result.candidates || result.candidates.length === 0 || !result.candidates[0].content?.parts?.[0]?.text) {
            console.error("[IA] Erro: A resposta do Gemini veio vazia ou em formato inesperado.", JSON.stringify(result, null, 2));
            return null;
        }
        
        const analise = result.candidates[0].content.parts[0].text;
        console.log(`[IA] ✅ Análise gerada com sucesso (${analise.length} caracteres)`);
        return analise.trim();

    } catch (error) {
        console.error("Erro ao chamar a função analisarResumoComIA:", error.message);
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
    let analiseIA = null; // Começa como nulo

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

        // 3. Chamar a IA (Gemini) ANTES de salvar no banco, com os dados dos questionários
        console.log(`[IA] Chamando Gemini para analisar o resumo do paciente ID: ${pacienteId} com dados de questionários...`);
        analiseIA = await analisarResumoComIA(texto_resumo, texto_expectativa, questionariosDados);

        if (!analiseIA) {
            console.warn(`[IA] Análise do Gemini falhou. Salvando resumo sem ela.`);
        } else {
            console.log(`[IA] ✅ Análise gerada com sucesso!`);
        }

        // 4. Salvar no banco
        const query = `
            INSERT INTO resumos_semanais 
                (paciente_id, data_fim_semana, texto_resumo, texto_expectativa, analise_ia)
            VALUES 
                ($1, CURRENT_DATE, $2, $3, $4)
            RETURNING *;
        `;
        
        const values = [
            pacienteId,
            texto_resumo,
            texto_expectativa,
            analiseIA // Salva a análise da IA (ou null se tiver falhado)
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