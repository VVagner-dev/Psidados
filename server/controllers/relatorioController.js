const db = require('../config/db');

// Métricas de cada questionário (escala e interpretação)
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
 * @route   GET /api/relatorio/semana/:paciente_id
 * @desc    Obtém relatório semanal com pontuações e análise
 * @access  Privado (Psicólogo)
 */
const obterRelatorioSemanal = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const psicologoId = req.psicologo?.id;
    
    // Verificar propriedade
    const pacienteResult = await db.query(
      'SELECT * FROM pacientes WHERE id = $1 AND psicologo_id = $2',
      [paciente_id, psicologoId]
    );
    
    if (pacienteResult.rows.length === 0) {
      return res.status(404).json({ message: 'Paciente não encontrado' });
    }
    
    // Buscar configuração de questionários do paciente
    const configResult = await db.query(
      'SELECT * FROM config_questionarios WHERE paciente_id = $1',
      [paciente_id]
    );
    
    if (configResult.rows.length === 0) {
      return res.status(404).json({ message: 'Configuração de questionários não encontrada' });
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
      [paciente_id, umaSemanaAtras]
    );
    
    const respostas = respostasResult.rows;
    
    // Agrupar respostas por questionário
    const scoresPorQuestionario = {};
    
    configuracao.forEach(config => {
      const qKey = config.questionario;
      scoresPorQuestionario[qKey] = [];
    });
    
    // Processar respostas
    respostas.forEach(resposta => {
      // Extrair questionarioId e respostas do JSON
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
          console.log(`⚠️ [obterRelatorioSemanal] Erro ao fazer parse: ${e.message}`);
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
      
      // Se temos questionarioId, usar ele; senão, tentar identificar pela quantidade de respostas
      if (questionarioId && scoresPorQuestionario[questionarioId]) {
        console.log(`✅ [obterRelatorioSemanal] ${questionarioId} encontrado com respostasArray:`, respostasArray);
        scoresPorQuestionario[questionarioId].push(respostasArray);
      } else if (respostasArray && (Array.isArray(respostasArray) || typeof respostasArray === 'object')) {
        // Tentar identificar pelo número de respostas
        const numRespostas = Array.isArray(respostasArray) ? respostasArray.length : Object.keys(respostasArray).length;
        console.log(`🔍 [obterRelatorioSemanal] Identificando por número de respostas: ${numRespostas}`);
        
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
    const relatorio = {
      paciente_id,
      data_geracao: new Date().toISOString(),
      questionarios: []
    };
    
    console.log(`📊 [obterRelatorioSemanal] Processando ${Object.entries(scoresPorQuestionario).length} questionários`);
    
    for (const [qKey, respostasArray] of Object.entries(scoresPorQuestionario)) {
      if (respostasArray.length === 0) {
        console.log(`⏭️ [obterRelatorioSemanal] ${qKey}: nenhuma resposta`);
        continue;
      }
      
      console.log(`✅ [obterRelatorioSemanal] ${qKey}: ${respostasArray.length} resposta(s)`);
      
      const metricas = METRICAS_QUESTIONARIOS[qKey];
      if (!metricas) {
        console.log(`❌ [obterRelatorioSemanal] ${qKey}: métrica não encontrada`);
        continue;
      }
      
      // Calcular score médio
      const scores = respostasArray.map(r => calcularPontuacao(qKey, r)).filter(s => s !== null);
      const scoreMediano = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const scoreAtual = scores.length > 0 ? scores[scores.length - 1] : 0;
      const scoreMaximo = scores.length > 0 ? Math.max(...scores) : 0;
      const scoreMinimo = scores.length > 0 ? Math.min(...scores) : scoreAtual;
      
      const severidade = obterSeveridade(qKey, scoreAtual);
      
      relatorio.questionarios.push({
        chave: qKey,
        titulo: metricas.titulo,
        score_atual: scoreAtual,
        score_medio: scoreMediano,
        score_maximo: scoreMaximo,
        score_minimo: scoreMinimo,
        max_possivel: metricas.max_score,
        percentual: Math.round((scoreAtual / metricas.max_score) * 100),
        severidade: severidade?.severidade || 'N/A',
        cor: severidade?.cor || '#gray',
        historico: scores
      });
    }
    
    // Buscar resumo semanal
    const resumoResult = await db.query(
      `SELECT * FROM resumos_semanais 
       WHERE paciente_id = $1
       ORDER BY data_fim_semana DESC
       LIMIT 1`,
      [paciente_id]
    );
    
    if (resumoResult.rows.length > 0) {
      const resumoRow = resumoResult.rows[0];
      relatorio.resumo_semanal = {
        ...resumoRow,
        // Garantir que analises_questionarios é um objeto, não string
        analises_questionarios: typeof resumoRow.analises_questionarios === 'string' 
          ? JSON.parse(resumoRow.analises_questionarios || '{}')
          : (resumoRow.analises_questionarios || {})
      };
    }
    
    return res.json(relatorio);
  } catch (error) {
    console.error('❌ Erro ao obter relatório:', error);
    return res.status(500).json({ message: 'Erro ao gerar relatório', error: error.message });
  }
};

/**
 * @route   POST /api/relatorio/gerar-ia/:paciente_id
 * @desc    Gera análise com IA usando Gemini
 * @access  Privado (Psicólogo)
 */
const gerarAnaliseIA = async (req, res) => {
  try {
    const { paciente_id } = req.params;
    const { relatorio } = req.body;
    
    if (!relatorio) {
      return res.status(400).json({ message: 'Relatório é obrigatório' });
    }
    
    // Preparar prompt para IA
    const prompt = construirPromptRelatorio(relatorio);
    
    // Chamar API Gemini (se configurada)
    let analiseIA = null;
    
    if (process.env.GOOGLE_AI_API_KEY) {
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const result = await model.generateContent(prompt);
        analiseIA = result.response.text();
      } catch (geminiError) {
        console.error('⚠️ Erro ao chamar Gemini:', geminiError.message);
        analiseIA = null;
      }
    } else {
      // Análise genérica se API não configurada
      analiseIA = gerarAnaliseGenerica(relatorio);
    }
    
    // Salvar análise no banco
    if (analiseIA) {
      const resumoResult = await db.query(
        'SELECT id FROM resumos_semanais WHERE paciente_id = $1 ORDER BY data_fim_semana DESC LIMIT 1',
        [paciente_id]
      );
      
      if (resumoResult.rows.length > 0) {
        await db.query(
          'UPDATE resumos_semanais SET analise_ia = $1 WHERE id = $2',
          [analiseIA, resumoResult.rows[0].id]
        );
      }
    }
    
    return res.json({
      sucesso: true,
      analise: analiseIA
    });
  } catch (error) {
    console.error('❌ Erro ao gerar análise IA:', error);
    return res.status(500).json({ message: 'Erro ao gerar análise', error: error.message });
  }
};

/**
 * Constrói o prompt para a IA gerar análise
 */
function construirPromptRelatorio(relatorio) {
  let prompt = `Você é um psicólogo experiente analisando o relatório semanal de um paciente.

DADOS DO RELATÓRIO:
-------------------\n`;

  // Adicionar dados dos questionários
  relatorio.questionarios.forEach(q => {
    prompt += `\n${q.titulo}:
- Score atual: ${q.score_atual}/${q.max_possivel}
- Severidade: ${q.severidade}
- Score médio da semana: ${q.score_medio}
- Variação (mín-máx): ${q.score_minimo} - ${q.score_maximo}\n`;
  });
  
  // Adicionar resumo semanal do paciente
  if (relatorio.resumo_semanal) {
    prompt += `\nRESUMO DA SEMANA (Paciente):
${relatorio.resumo_semanal.texto_resumo}\n`;
    
    prompt += `\nEXPECTATIVAS PARA PRÓXIMA SEMANA:
${relatorio.resumo_semanal.texto_expectativa}\n`;
  }
  
  prompt += `\nSOLICITAÇÃO:
Gere uma análise profissional e empática considerando:
1. Tendências nos scores (melhora ou piora)
2. Correlações entre depressão, ansiedade e afeto
3. Contexto do resumo semanal do paciente
4. Recomendações ou observações para próximas semanas

Responda em português, sendo claro e acessível ao paciente.`;
  
  return prompt;
}

/**
 * Gera análise genérica sem API de IA
 */
function gerarAnaliseGenerica(relatorio) {
  let analise = '## Análise da Sua Semana\n\n';
  
  // Análise por questionário
  relatorio.questionarios.forEach(q => {
    analise += `### ${q.titulo}\n`;
    analise += `Seu score dessa semana foi **${q.score_atual}/${q.max_possivel}** (${q.severidade}).\n`;
    
    if (q.historico.length > 1) {
      const tendencia = q.historico[q.historico.length - 1] > q.score_medio ? 'melhora' : 'piora';
      analise += `Você apresenta uma tendência de **${tendencia}** comparado à média da semana.\n`;
    }
    
    analise += '\n';
  });
  
  analise += '### Próximos Passos\n';
  analise += 'Continue respondendo aos questionários conforme programado. Sua psicóloga analisará seus dados e conversaremos sobre estratégias de bem-estar.\n';
  
  return analise;
}

module.exports = {
  obterRelatorioSemanal,
  gerarAnaliseIA,
  calcularPontuacao,
  obterSeveridade,
  METRICAS_QUESTIONARIOS
};
