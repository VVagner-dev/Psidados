const db = require('../config/db');

// Usa fetch global (Node 18+). Caso não exista, tente usar node-fetch.
const fetch = global.fetch || require('node-fetch');

const baseUrl = 'http://localhost:3001';

async function applyMigration() {
  console.log('Applying DB migration: add configuracao column if not exists...');
  await db.query("ALTER TABLE config_questionarios ADD COLUMN IF NOT EXISTS configuracao JSONB;");
  console.log('Migration applied.');
}

async function run() {
  try {
    await applyMigration();

    // 1) Registrar psicólogo de teste
    console.log('\n1) Registrando psicólogo de teste...');
    const regRes = await fetch(`${baseUrl}/api/auth/registrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Teste Psico Auto', email: 'teste_psico_auto@example.com', senha: 'senha123', crp: '00/AUTO01' })
    });
    const regJson = await regRes.json().catch(() => ({}));
    console.log('registrar -> status', regRes.status, regJson.message || JSON.stringify(regJson));

    // 2) Login psicólogo
    console.log('\n2) Logando psicólogo...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'teste_psico_auto@example.com', senha: 'senha123' })
    });
    const loginJson = await loginRes.json();
    if (!loginRes.ok) { console.error('Login psicólogo falhou:', loginRes.status, loginJson); return; }
    const psicToken = loginJson.token;
    console.log('Login psicólogo ok. Token length:', psicToken ? psicToken.length : 'MISSING');

    // 3) Criar paciente
    console.log('\n3) Criando paciente...');
    const createRes = await fetch(`${baseUrl}/api/pacientes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${psicToken}` },
      body: JSON.stringify({ nome: 'Paciente Teste Auto', email: 'paciente.teste.auto@example.com' })
    });
    const createJson = await createRes.json();
    if (!createRes.ok) { console.error('Criar paciente falhou:', createRes.status, createJson); return; }
    const paciente = createJson.paciente;
    console.log('Paciente criado:', paciente.id, 'codigo_acesso:', paciente.codigo_acesso);

    // 4) Configurar questionarios (dias 2,4,6 -> ter,qui,sab) mapeados para questionario1/2/3
    console.log('\n4) Configurando 3 dias/questionários para o paciente...');
    const cfgPayload = { configuracao_questionarios: [ { diaId: 2, questionarioId: 1 }, { diaId: 4, questionarioId: 2 }, { diaId: 6, questionarioId: 3 } ] };
    const cfgRes = await fetch(`${baseUrl}/api/pacientes/${paciente.id}/questionario`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${psicToken}` }, body: JSON.stringify(cfgPayload)
    });
    const cfgJson = await cfgRes.json();
    console.log('Configurar ->', cfgRes.status, cfgJson.message || JSON.stringify(cfgJson));

    // 5) Login paciente (usar codigo_acesso)
    console.log('\n5) Logando como paciente usando codigo_acesso...');
    const pLoginRes = await fetch(`${baseUrl}/api/paciente-auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo_acesso: paciente.codigo_acesso }) });
    const pLoginJson = await pLoginRes.json();
    if (!pLoginRes.ok) { console.error('Login paciente falhou:', pLoginRes.status, pLoginJson); return; }
    const pToken = pLoginJson.token;
    console.log('Paciente token length:', pToken ? pToken.length : 'MISSING');

    // 6) Simular 3 dias: Vamos usar 3 datas próximas que correspondam a terça, quinta e sábado.
    // Escolhemos 2025-11-11 (terça), 2025-11-13 (quinta), 2025-11-15 (sábado)
    const testDates = ['2025-11-11', '2025-11-13', '2025-11-15'];

    for (let i = 0; i < testDates.length; i++) {
      const d = testDates[i];
      console.log(`\n--- Dia de teste ${d} (simulando GET /api/questionario/hoje?test_date=${d})`);
      const todayRes = await fetch(`${baseUrl}/api/questionario/hoje?test_date=${d}`, { headers: { Authorization: `Bearer ${pToken}`, 'X-Test-Mode': 'true' } });
      const todayJson = await todayRes.json();
      console.log('GET hoje ->', todayRes.status, JSON.stringify(todayJson).slice(0, 500));

      if (todayJson.temQuestionarioHoje) {
        // Montar respostas genéricas dependendo do tipo
        let respostas = null;
        const q = todayJson.questionario;
        if (q.perguntas && Array.isArray(q.perguntas)) {
          // se perguntas são strings (PHQ/GAD), enviar zeros
          if (typeof q.perguntas[0] === 'string') {
            respostas = new Array(q.perguntas.length).fill(1);
          } else {
            // para questionario3 (misto), enviar um objeto
            respostas = { nota_humor: 4, reflexao_texto: 'Me senti ok neste dia.' };
          }
        } else {
          respostas = [];
        }

        console.log('Enviando respostas (tipo sample) para', d);
        const sendRes = await fetch(`${baseUrl}/api/questionario/responder`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pToken}` },
          body: JSON.stringify({ respostas, dataResposta: d })
        });
        const sendJson = await sendRes.json();
        console.log('POST responder ->', sendRes.status, JSON.stringify(sendJson));

        if (sendJson.resumoNecessario) {
          console.log('Resumo necessário detectado! Enviando resumo...');
          const resumoBody = { resumo_semanal: 'Minha semana foi produtiva e desafiadora.', expectativa_semana: 'Quero dormir melhor e manter rotina.' };
          const resumoRes = await fetch(`${baseUrl}/api/resumo/semanal`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pToken}` }, body: JSON.stringify(resumoBody) });
          const resumoJson = await resumoRes.json();
          console.log('POST resumo/semanal ->', resumoRes.status, JSON.stringify(resumoJson));
        }
      } else {
        console.log('Sem questionário neste dia (ou já respondeu).');
      }
    }

    console.log('\nFluxo de teste concluído.');

  } catch (err) {
    console.error('Erro no script de teste:', err);
    process.exit(1);
  }
}

run();
