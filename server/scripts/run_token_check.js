const db = require('../config/db');
const fetch = global.fetch || require('node-fetch');
const jwt = require('jsonwebtoken');
const baseUrl = 'http://localhost:3001';

(async () => {
  try {
    // login psicologo
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'teste_psico_verb@example.com', senha: 'senha123' }) });
    const loginJson = await loginRes.json();
    console.log('psic login status', loginRes.status);
    const psicToken = loginJson.token;
    console.log('psic token len', psicToken && psicToken.length);
    try { const decoded = jwt.verify(psicToken, process.env.JWT_SECRET); console.log('psic decoded:', decoded); } catch (e) { console.error('psic verify failed:', e.message); }

    // create/get patient (we created earlier in verbose script)
    const pacientesRes = await fetch(`${baseUrl}/api/pacientes`, { method: 'GET', headers: { Authorization: `Bearer ${psicToken}` } });
    const pacientes = await pacientesRes.json();
    const paciente = pacientes.find(p => p.email === 'paciente.verb@example.com');
    console.log('found paciente', paciente && paciente.id);

    // login paciente
    const pLoginRes = await fetch(`${baseUrl}/api/paciente-auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo_acesso: paciente.codigo_acesso }) });
    const pLoginJson = await pLoginRes.json();
    console.log('pLogin status', pLoginRes.status, pLoginJson.message || 'ok');
    const pToken = pLoginJson.token;
    console.log('p token len', pToken && pToken.length, 'token:', pToken);
    try { const decodedP = jwt.verify(pToken, process.env.JWT_SECRET); console.log('paciente decoded:', decodedP); } catch (e) { console.error('pac verify failed:', e.message); }
    // Gerar um novo token localmente (mesmo payload) para testar middleware
    const generated = jwt.sign({ id: paciente.id, tipo: 'paciente' }, process.env.JWT_SECRET, { expiresIn: '8h' });
    console.log('Generated token len', generated.length);

    // Testar GET /api/questionario/hoje com o token gerado localmente
    const testDate = '2025-11-11';
    const testGet = await fetch(`${baseUrl}/api/questionario/hoje?test_date=${testDate}`, { headers: { Authorization: `Bearer ${generated}`, 'X-Test-Mode': 'true' } });
    console.log('GET with generated token status', testGet.status, await testGet.text());

  } catch (err) {
    console.error('Error in token_check script', err);
  }
})();
