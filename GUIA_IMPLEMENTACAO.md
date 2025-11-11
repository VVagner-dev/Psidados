# 📋 Guia de Implementação - IA com 3 Textos Separados

## ✅ O que foi implementado:

### Backend (Node.js)
- **resumoController.js**: Refatorado para gerar **3 análises separadas** via Gemini:
  1. `resumo_geral` - Resumo da Semana
  2. `analise_pontos` - Análise e Pontos de Atenção
  3. `analises_questionarios` - Texto individual para cada questionário (PHQ-9, GAD-7, PANAS)

### Frontend (React)
- **RelatorioSemanal.jsx**: Exibe as 3 seções com estilos distintos:
  1. **Resumo Geral da Semana** - Card azul
  2. **Análise e Pontos de Atenção** - Card âmbar
  3. **Análise Individual dos Questionários** - Cards coloridos por questionário

### Banco de Dados
- 3 novas colunas em `resumos_semanais`:
  - `resumo_geral` (TEXT)
  - `analise_pontos` (TEXT)
  - `analises_questionarios` (JSONB) - {"questionario1": "...", "questionario2": "...", "questionario3": "..."}

---

## 🚀 PASSO A PASSO PARA TESTAR

### 1️⃣ Aplicar Migração do Banco de Dados

Abra PowerShell no diretório do servidor e execute:

```powershell
cd "c:\Users\Ágape\Desktop\VV\Faesa\Psidados\Psidados\server"
npm run migrate
```

**Esperado:**
```
📝 [MIGRATE] Iniciando migrações do banco de dados...

ℹ️  Colunas já existentes: nenhuma
  ➕ Adicionando coluna: resumo_geral...
  ✅ resumo_geral adicionada
  ➕ Adicionando coluna: analise_pontos...
  ✅ analise_pontos adicionada
  ➕ Adicionando coluna: analises_questionarios...
  ✅ analises_questionarios adicionada

✅ Migrações executadas com sucesso!
```

---

### 2️⃣ Iniciar Backend e Frontend

**Terminal 1 - Backend:**
```powershell
cd "c:\Users\Ágape\Desktop\VV\Faesa\Psidados\Psidados"
npm run server
```

**Terminal 2 - Frontend:**
```powershell
cd "c:\Users\Ágape\Desktop\VV\Faesa\Psidados\Psidados"
npm run client
```

Ou em um terminal único:
```powershell
npm run dev
```

---

### 3️⃣ Testar o Fluxo Completo

1. **Acessar http://localhost:5173**

2. **Login como Psicólogo:**
   - Email: (seu email registrado)
   - CRP: (seu CRP)
   - Senha: (sua senha)

3. **Selecionar um paciente** → Clicar em "Ver Paciente"

4. **Aguardar as respostas serem coletadas** (ou usar Modo Teste para simular datas)

5. **Quando 3 respostas forem feitas**, um botão aparecerá para o paciente preencher:
   - "Como você descreveria a semana que passou?"
   - "Quais são suas expectativas para a próxima semana?"

6. **Após enviar o resumo**, o backend:
   - Busca os dados dos 3 questionários
   - Chama Gemini API **3 vezes** com prompts diferentes
   - Salva no banco:
     - `resumo_geral`
     - `analise_pontos`
     - `analises_questionarios` (com textos de cada questão)

7. **Voltar ao Dashboard** e clicar no botão "Relatório Semanal"

8. **Ver as 3 seções com os textos da IA:**
   - ✅ Resumo Geral da Semana
   - ✅ Análise e Pontos de Atenção
   - ✅ Análise Individual dos Questionários (3 textos separados)

---

## 🧪 Modo Teste (Para Simular Datas)

Se quiser testar sem esperar dias reais:

1. Na página do questionário, procure o painel **"Modo de Teste"** (canto inferior direito)
2. Use o date picker para simular diferentes datas
3. Responda questionários conforme a data simulada
4. Após 3 respostas, preencha o resumo

---

## 📊 Estrutura de Dados Salvos

Quando o resumo é enviado, o banco salva:

```json
{
  "id": 1,
  "paciente_id": 5,
  "data_fim_semana": "2025-11-11",
  "texto_resumo": "A semana foi boa, consegui dormir bem...",
  "texto_expectativa": "Espero continuar melhorando...",
  
  // Novo: Resumo Geral
  "resumo_geral": "O paciente apresentou uma semana positiva com relatos de boa qualidade de sono. Os dados dos questionários indicam...",
  
  // Novo: Análise e Pontos de Atenção
  "analise_pontos": "Correlação entre depressão e ansiedade permanece moderada. Pontos de atenção: score de afeto abaixo da média...",
  
  // Novo: Análises Individuais
  "analises_questionarios": {
    "questionario1": "PHQ-9 (Depressão): Seu score foi 8/27, indicando depressão leve. Comparado à média...",
    "questionario2": "GAD-7 (Ansiedade): Seu score foi 5/21, indicando ansiedade mínima. Observa-se...",
    "questionario3": "PANAS (Afeto): Seu score foi 65/100, indicando afeto positivo elevado. Tendência..."
  }
}
```

---

## 🐛 Troubleshooting

### "Erro: column already exists"
- **Causa**: Banco de dados já foi migrado
- **Solução**: Execute novamente, o script detecta e ignora colunas existentes

### "Erro: GOOGLE_AI_API_KEY não encontrada"
- **Verificar**: Se a chave está no arquivo `.env`
- **Solução**: Copie a chave correta para `server/.env`

### "Relatório não mostra os textos da IA"
- **Verificar**: Se o resumo foi enviado e processado pelo backend (veja logs)
- **Solução**: Aguarde a resposta do Gemini (pode levar alguns segundos)

### "Frontend não atualiza após enviar resumo"
- **Causa**: Cache do navegador
- **Solução**: F5 para recarregar ou Ctrl+Shift+R para limpeza de cache

---

## ✨ Resultado Final Esperado

O relatório do paciente mostrará:

```
═══════════════════════════════════════════════════════════════

📊 RELATÓRIO SEMANAL

[Gráfico de Pizza com Scores]

═══════════════════════════════════════════════════════════════

📋 RESUMO GERAL DA SEMANA
"O paciente apresentou uma semana com bom engajamento nas 
atividades. A qualidade de sono melhorou em comparação com 
as semanas anteriores..."

═══════════════════════════════════════════════════════════════

⚠️ ANÁLISE E PONTOS DE ATENÇÃO
"Observa-se uma correlação positiva entre os scores de 
depressão e ansiedade. O afeto permanece estável. Recomenda-se
continuar com as estratégias atuais..."

═══════════════════════════════════════════════════════════════

📈 ANÁLISE INDIVIDUAL DOS QUESTIONÁRIOS

  🔴 PHQ-9 (Depressão) - Leve
  "Seu score foi 8/27, indicando depressão leve. Comparado 
   à média da semana (10), você apresenta melhora..."

  🔵 GAD-7 (Ansiedade) - Mínima
  "Seu score foi 5/21, indicando ansiedade mínima. Mantendo 
   esta tendência, os próximos passos devem focar..."

  🟢 PANAS (Afeto) - Alto
  "Seu score foi 65/100, indicando afeto positivo elevado. 
   Tendência de melhora observada. Significado clínico..."

═══════════════════════════════════════════════════════════════
```

---

## ✅ Checklist Final

- [ ] Executar `npm run migrate`
- [ ] Backend iniciado: `npm run server`
- [ ] Frontend iniciado: `npm run client`
- [ ] Login como psicólogo
- [ ] Selecionar paciente
- [ ] Simular 3 respostas (ou aguardar 3 dias)
- [ ] Preencher resumo semanal
- [ ] Visualizar relatório com 3 textos de IA
- [ ] ✨ Teste concluído!

---

**Dúvidas?** Consulte os logs do backend (mostra status de cada chamada Gemini)

**Sucesso!** 🚀
