// --- Controladores de Resumo Semanal (com IA) ---

const db = require('../config/db');
// Importa o 'fetch' que criámos (que usa 'node-fetch')
const { fetch } = require('../utils/fetch');

// -----------------------------------------------------------------
// FUNÇÃO DE IA (GEMINI)
// -----------------------------------------------------------------

/**
 * Chama a API do Gemini para analisar o texto do paciente.
 * @param {string} textoResumo - O resumo da semana do paciente.
 * @param {string} textoExpectativa - A expectativa do paciente para a próxima semana.
 * @returns {Promise<string>} - A análise gerada pela IA.
 */
async function analisarResumoComIA(textoResumo, textoExpectativa) {
    // 1. Obter a Chave da API do .env
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error("[IA] Erro: GEMINI_API_KEY não encontrada no ficheiro .env");
        return null;
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

    // 2. O Prompt (A "Ordem" para a IA)
    // Damos à IA o papel de "Psicólogo Assistente"
    const systemPrompt = `
        Aja como um assistente de psicologia. 
        Você receberá dois textos de um paciente: um resumo da semana que passou e as suas expectativas para a próxima.
        A sua tarefa é gerar uma breve análise (1-2 parágrafos) para o psicólogo deste paciente.
        
        O que analisar:
        - Identifique o sentimento principal (ex: otimismo, ansiedade, frustração, alívio).
        - Aponte temas-chave ou conflitos (ex: "dificuldade no trabalho", "problemas de sono").
        - Verifique se a expectativa para a próxima semana é realista ou se há algum ponto de atenção.
        - Se o paciente mencionar a terapia ou o psicólogo, note isso.

        Responda em português do Brasil e num tom profissional, mas empático.
    `;

    // 3. O Texto do Utilizador (O que o paciente escreveu)
    const userPrompt = `
        **Resumo da Semana:**
        "${textoResumo}"

        **Expectativa para a Próxima Semana:**
        "${textoExpectativa}"
    `;

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
            // maxOutputTokens: 512, // Limita o tamanho da resposta
            temperature: 0.7, // Um pouco criativo, mas não muito
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
        // A correção para o erro "Cannot read properties of undefined (reading '0')"
        if (!result.candidates || result.candidates.length === 0 || !result.candidates[0].content?.parts?.[0]?.text) {
            console.error("[IA] Erro: A resposta do Gemini veio vazia ou em formato inesperado.", JSON.stringify(result, null, 2));
            return null;
        }
        
        const analise = result.candidates[0].content.parts[0].text;
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
 * @desc    (Paciente) Salva o resumo semanal e chama a IA
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
        
        // (Validação extra: verificar se o paciente já enviou esta semana? Pode ser adicionado aqui)

        // 2. Chamar a IA (Gemini) ANTES de salvar no banco
        console.log(`[IA] Chamando Gemini para analisar o resumo do paciente ID: ${pacienteId}...`);
        analiseIA = await analisarResumoComIA(texto_resumo, texto_expectativa);

        if (!analiseIA) {
            console.warn(`[IA] Análise do Gemini falhou. Salvando resumo sem ela.`);
        }

        // 3. Salvar no banco (na Tabela 5)
        // CORREÇÃO DO ERRO SQL (Problema 1 do seu log):
        // Removemos $2 e $3 (onde estava CURRENT_DATE)
        // e colocamos CURRENT_DATE diretamente no SQL.
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
        console.error("Erro ao salvar resumo semanal:", error);
        // Se a IA falhou mas o erro foi no banco, o 'analiseIA' já pode ter um valor
        // Por isso, registamos o erro completo.
        res.status(500).json({ message: "Erro interno no servidor." });
    }
};

module.exports = {
    salvarResumoSemanal
};