const db = require('../config/db');
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

    const regRes = await fetch(`${baseUrl}/api/auth/registrar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'Teste Psico Verb', email: 'teste_psico_verb@example.com', senha: 'senha123', crp: '00/AUTO02' })
    });
    const regJson = await regRes.json().catch(() => ({}));
    console.log('registrar ->', regRes.status, regJson.message);

    const loginRes = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'teste_psico_verb@example.com', senha: 'senha123' }) });
    const loginJson = await loginRes.json();
    const psicToken = loginJson.token;
    console.log('Psicólogo token:', psicToken);

    const createRes = await fetch(`${baseUrl}/api/pacientes`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${psicToken}` }, body: JSON.stringify({ nome: 'Paciente Verb', email: 'paciente.verb@example.com' }) });
    const createJson = await createRes.json();
    const paciente = createJson.paciente;
    console.log('Paciente criado:', paciente.id, paciente.codigo_acesso);

    const cfgPayload = { configuracao_questionarios: [ { diaId: 2, questionarioId: 1 }, { diaId: 4, questionarioId: 2 }, { diaId: 6, questionarioId: 3 } ] };
    const cfgRes = await fetch(`${baseUrl}/api/pacientes/${paciente.id}/questionario`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${psicToken}` }, body: JSON.stringify(cfgPayload) });
    console.log('Configurar status:', cfgRes.status, await cfgRes.json());

    const pLoginRes = await fetch(`${baseUrl}/api/paciente-auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo_acesso: paciente.codigo_acesso }) });
    const pLoginJson = await pLoginRes.json();
    const pToken = pLoginJson.token;
    console.log('Paciente token:', pToken);

    // Make one GET with explicit header
    const d = '2025-11-11';
    console.log('\nTesting GET /api/questionario/hoje with patient token...');
    const getRes = await fetch(`${baseUrl}/api/questionario/hoje?test_date=${d}`, { headers: { Authorization: `Bearer ${pToken}`, 'X-Test-Mode': 'true' } });
    const getJson = await getRes.text();
    console.log('GET status:', getRes.status, 'body:', getJson);

  } catch (err) {
    console.error('Error verbose script:', err);
  }
}

run();
