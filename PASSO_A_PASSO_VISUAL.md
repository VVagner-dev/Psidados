# 🎬 PASSO A PASSO VISUAL - Teste as 3 Análises de IA

## ✅ CHECKLIST PRÉ-REQUISITOS

- [x] Migration executada: `npm run migrate` ✅
- [x] Backend rodando: http://localhost:3001 ✅
- [x] Frontend rodando: http://localhost:5173 ✅
- [x] Banco PostgreSQL conectado ✅
- [x] Chave Gemini no `.env` ✅

---

## 📱 TESTE PASSO A PASSO

### PASSO 1: Acessar o Sistema

```
Abrir navegador → http://localhost:5173
```

**Você verá:**
```
┌────────────────────────────────────────┐
│     🧠 PsiDados - Bem-vindo            │
│                                        │
│  ┌────────────────────────────────────┐│
│  │ É Psicólogo? Crie sua Conta        ││
│  │ ou Faça Login                       ││
│  └────────────────────────────────────┘│
│                                        │
│  ┌────────────────────────────────────┐│
│  │ Portal do Paciente                 ││
│  │ Digite seu código de acesso        ││
│  └────────────────────────────────────┘│
└────────────────────────────────────────┘
```

---

### PASSO 2: Login como Psicólogo

```
Clique: "É Psicólogo? Crie sua Conta"

Preencha (ou use dados existentes):
├─ Nome: Dr. João Silva
├─ Email: joao@psicologia.com
├─ CRP: 06/123456
└─ Senha: senha123

Clique: "Criar Conta"
```

**Você será redirecionado para o Dashboard**

---

### PASSO 3: Selecionar um Paciente

```
No Dashboard, você verá:

┌─────────────────────────────────────────┐
│ Meus Pacientes                          │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 👤 Paciente A                       │ │
│ │ Código: ABC123                      │ │
│ │ Data adicionado: 10/11/2025         │ │
│ │ [Ver Paciente] [Configurar] [...]  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 👤 Paciente B                       │ │
│ │ Código: XYZ789                      │ │
│ │ Data adicionado: 09/11/2025         │ │
│ │ [Ver Paciente] [Configurar] [...]  │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Clique em:** "Ver Paciente" de qualquer um

---

### PASSO 4: Visualizar Respostas do Paciente

```
Você verá a tela:

┌───────────────────────────────────────┐
│ Paciente: João Santos                 │
├───────────────────────────────────────┤
│ Respostas da Semana:                  │
│                                       │
│ ✅ Segunda: PHQ-9 (8/27) 📉           │
│ ✅ Quarta: GAD-7 (5/21)  ➡️           │
│ ✅ Sexta: PANAS (65/100) 📈           │
│                                       │
│ Status: 3/3 respostas completadas     │
│                                       │
│ [Exibir Relatório] [Editar Config]   │
└───────────────────────────────────────┘
```

---

### PASSO 5: Clique em "Exibir Relatório"

```
Você será levado para:

┌──────────────────────────────────────────────────┐
│ RELATÓRIO SEMANAL                               │
├──────────────────────────────────────────────────┤
│                                                  │
│ [Gráfico de Pizza com Scores]                   │
│ PHQ-9: 8/27  │  GAD-7: 5/21  │  PANAS: 65/100  │
│                                                  │
├──────────────────────────────────────────────────┤
│ ⬇️  ROLE PARA BAIXO PARA VER OS 3 TEXTOS DA IA  │
└──────────────────────────────────────────────────┘
```

---

### PASSO 6: SEÇÃO 1 - Resumo Geral da Semana

```
┌──────────────────────────────────────────────────┐
│ 📋 Resumo Geral da Semana                        │
├──────────────────────────────────────────────────┤
│                                                  │
│ "O paciente apresentou uma semana positiva      │
│  com bom engajamento nas atividades. Relatou    │
│  melhoria na qualidade de sono comparada às     │
│  semanas anteriores. As expectativas para a     │
│  próxima semana incluem manutenção das rotinas  │
│  e exploração de novas estratégias de           │
│  enfrentamento. O padrão de respostas aos       │
│  questionários demonstra estabilidade."          │
│                                                  │
│ ✨ Resumo gerado com IA                         │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Texto é único, resumindo tudo da semana**

---

### PASSO 7: SEÇÃO 2 - Análise e Pontos de Atenção

```
┌──────────────────────────────────────────────────┐
│ ⚠️  Análise e Pontos de Atenção                  │
├──────────────────────────────────────────────────┤
│                                                  │
│ "Observa-se uma correlação favorável entre      │
│  redução de ansiedade e manutenção do humor.    │
│  A qualidade de sono melhorou, contributing     │
│  para redução de sintomas depressivos.          │
│                                                  │
│  Ponto de atenção: O afeto positivo elevado     │
│  deve ser mantido com atividades sociais.       │
│  Recomenda-se continuação das técnicas de       │
│  mindfulness que demonstraram eficácia.         │
│                                                  │
│  Sugestão: Explorar novas atividades para       │
│  ampliação da base de enfrentamento."            │
│                                                  │
│ ✨ Análise gerada com IA - Consulte seu         │
│    psicólogo para discussão aprofundada         │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Texto é único, análise profunda e correlações**

---

### PASSO 8: SEÇÃO 3 - Análise Individual (1ª questão)

```
┌──────────────────────────────────────────────────┐
│ 📈 Análise Individual dos Questionários         │
├──────────────────────────────────────────────────┤
│                                                  │
│ ┌───────────────────────────────────────────┐  │
│ │ 🔴 PHQ-9 (Depressão)  [Leve]              │  │
│ ├───────────────────────────────────────────┤  │
│ │                                           │  │
│ │ "Seu score de depressão nesta semana      │  │
│ │  foi 8/27, indicando depressão leve.      │  │
│ │  Comparado à média da semana (10), você   │  │
│ │  apresenta melhora. Os sintomas           │  │
│ │  principais foram dificuldade de          │  │
│ │  concentração, tendência que está         │  │
│ │  reduzindo. Continue as estratégias       │  │
│ │  atuais."                                 │  │
│ │                                           │  │
│ ├───────────────────────────────────────────┤  │
│ │ Status Atual: 8/27                        │  │
│ │ Tendência: 📉 Abaixo da média             │  │
│ └───────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Texto 1/3: Análise específica para PHQ-9**

---

### PASSO 9: SEÇÃO 3 - Análise Individual (2ª questão)

```
┌──────────────────────────────────────────────────┐
│ ┌───────────────────────────────────────────┐  │
│ │ 🔵 GAD-7 (Ansiedade)  [Mínima]            │  │
│ ├───────────────────────────────────────────┤  │
│ │                                           │  │
│ │ "Sua ansiedade permanece em nível mínimo  │  │
│ │  (5/21). Não há sinais de deterioração    │  │
│ │  comparado às semanas anteriores. Os      │  │
│ │  sintomas de preocupação excessiva        │  │
│ │  mantêm-se baixos. Recomenda-se          │  │
│ │  manutenção das práticas de mindfulness   │  │
│ │  e técnicas de respiração que             │  │
│ │  demonstraram eficácia."                  │  │
│ │                                           │  │
│ ├───────────────────────────────────────────┤  │
│ │ Status Atual: 5/21                        │  │
│ │ Tendência: ➡️ Dentro da média             │  │
│ └───────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Texto 2/3: Análise específica para GAD-7**

---

### PASSO 10: SEÇÃO 3 - Análise Individual (3ª questão)

```
┌──────────────────────────────────────────────────┐
│ ┌───────────────────────────────────────────┐  │
│ │ 🟢 PANAS (Afeto)  [Muito Alto]            │  │
│ ├───────────────────────────────────────────┤  │
│ │                                           │  │
│ │ "Seu afeto positivo está em nível muito   │  │
│ │  alto (65/100), o que é um indicador      │  │
│ │  altamente favorável. Você relata         │  │
│ │  sentimentos de esperança, engajamento    │  │
│ │  e satisfação com a vida. Tendência de    │  │
│ │  melhora observada em comparação com      │  │
│ │  semanas anteriores. Mantenha as          │  │
│ │  atividades que geram satisfação."        │  │
│ │                                           │  │
│ ├───────────────────────────────────────────┤  │
│ │ Status Atual: 65/100                      │  │
│ │ Tendência: 📈 Acima da média              │  │
│ └───────────────────────────────────────────┘  │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Texto 3/3: Análise específica para PANAS**

---

### PASSO 11: Exportar para PDF (Opcional)

```
Clique no botão: [⬇️ PDF]

O sistema gera um PDF com:
├─ Gráfico de pizza
├─ Resumo Geral da Semana
├─ Análise e Pontos de Atenção
└─ Análise Individual dos 3 Questionários
```

---

## 🧪 TESTE ALTERNATIVO: Modo Teste (Sem Esperar)

Se não tiver 3 respostas ainda, use o **Modo de Teste**:

```
1. Como Paciente, acesse o Questionário
2. Procure por "🧪 Modo de Teste" (canto inferior)
3. Use o date picker para simular dias
4. Responda questionários para diferentes datas
5. Após 3 respostas, preencha o resumo
6. Volte ao Dashboard e veja o relatório
```

---

## ✅ VALIDAÇÃO

### Se tudo funcionou corretamente, você verá:

✅ **Resumo Geral da Semana** - 1 parágrafo único  
✅ **Análise e Pontos de Atenção** - Análise correlativa  
✅ **PHQ-9 Análise** - Texto específico para depressão  
✅ **GAD-7 Análise** - Texto específico para ansiedade  
✅ **PANAS Análise** - Texto específico para afeto  

**Total: 5 textos gerados por IA** (1 resumo + 1 análise geral + 3 análises individuais)

---

## 🐛 TROUBLESHOOTING

| Problema | Causa | Solução |
|----------|-------|---------|
| "Sem dados de relatório" | Paciente não tem 3 respostas | Use Modo Teste ou aguarde 3 dias |
| "Textos em branco" | Gemini API falhou | Verificar chave `.env` e créditos |
| "Erro ao salvar" | Banco não migrado | Executar `npm run migrate` |
| "Página vazia" | Frontend não carregou | Recarregar F5 e limpar cache |
| "Conexão recusada 3001" | Backend offline | Executar `npm run dev` na pasta server |

---

## 🎯 RESULTADO FINAL ESPERADO

```
┌──────────────────────────────────────────────────────────────┐
│  ✨ RELATÓRIO SEMANAL COM 3 ANÁLISES DE IA ✨              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ Seção 1: Resumo Geral da Semana (Texto IA)             │
│  ✅ Seção 2: Análise e Pontos de Atenção (Texto IA)        │
│  ✅ Seção 3: PHQ-9 Análise Individual (Texto IA)           │
│  ✅ Seção 4: GAD-7 Análise Individual (Texto IA)           │
│  ✅ Seção 5: PANAS Análise Individual (Texto IA)           │
│                                                              │
│  📊 Gráfico de Pizza com Scores                            │
│  📈 Tendências por Questionário                            │
│  ⬇️ Botão de Exportar PDF                                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘

                    🎉 SUCESSO! 🎉
```

---

**Qualquer dúvida?** Consulte os logs do backend (terminal) para diagnóstico!

**Data**: 11 de Novembro de 2025  
**Versão**: 1.0.0  
**Status**: ✅ Pronto para Teste
