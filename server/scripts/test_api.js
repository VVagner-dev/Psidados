const db = require('../config/db');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const baseUrl = 'http://localhost:3001';

const testApi = async () => {
  try {
    // Test base URL first
    console.log('Testing base URL...');
    const baseTest = await fetch(baseUrl);
    const baseText = await baseTest.text();
    console.log('Base URL response:', baseTest.status, baseText);

    // login psicologo
    console.log('\nAttempting psychologist login...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teste_psico_verb@example.com', senha: 'senha123' })
    });
    
    if (!loginRes.ok) {
      const errorText = await loginRes.text();
      console.error('Login failed:', loginRes.status, errorText);
      return;
    }

    const loginJson = await loginRes.json();
    console.log('Psychologist login successful:', loginRes.status);
    const psicToken = loginJson.token;

    if (!psicToken) {
      console.error('No token received from login');
      return;
    }

    console.log('Token received, length:', psicToken.length);
    
    // Verify token
    try {
      const decoded = jwt.verify(psicToken, process.env.JWT_SECRET);
      console.log('Token verification successful:', decoded);
    } catch (e) {
      console.error('Token verification failed:', e.message);
      return;
    }

    // Test protected endpoint
    const pacientesRes = await fetch(`${baseUrl}/api/pacientes`, {
      headers: { Authorization: `Bearer ${psicToken}` }
    });

    console.log('\nTesting protected endpoint...');
    if (!pacientesRes.ok) {
      const errorText = await pacientesRes.text();
      console.error('Protected endpoint failed:', pacientesRes.status, errorText);
      return;
    }

    const pacientes = await pacientesRes.json();
    console.log('Protected endpoint successful:', pacientesRes.status);
    console.log('Patients found:', pacientes.length);

  } catch (err) {
    console.error('Test script error:', err);
    if (err.code === 'ECONNREFUSED') {
      console.error('Could not connect to server. Is it running on port 3001?');
    }
  }
};

testApi();