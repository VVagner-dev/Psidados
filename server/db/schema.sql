-- ----------------------------------------------------
-- Script Completo: DROP e CREATE para o Projeto PsiDados
-- Dialeto: PostgreSQL
-- ----------------------------------------------------

-- ----------------------------------------------------
-- PARTE 1: APAGAR AS TABELAS (em ordem inversa)
-- Usamos "CASCADE" para remover dependências (chaves estrangeiras)
-- ----------------------------------------------------

DROP TABLE IF EXISTS resumos_semanais CASCADE;
DROP TABLE IF EXISTS respostas_diarias CASCADE;
DROP TABLE IF EXISTS config_questionarios CASCADE;
DROP TABLE IF EXISTS pacientes CASCADE;
DROP TABLE IF EXISTS psicologos CASCADE;

-- ----------------------------------------------------
-- PARTE 2: CRIAR AS TABELAS (em ordem correta)
-- ----------------------------------------------------

-- Tabela 1: psicologos
-- Armazena os dados de login dos profissionais.
CREATE TABLE psicologos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,    -- Senha guardada como hash (bcrypt)
    crp VARCHAR(50) UNIQUE,              -- Registro profissional (deve ser único)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela 2: pacientes
-- Armazena os pacientes e os vincula aos psicólogos.
CREATE TABLE pacientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,           -- Email do paciente (opcional, mas único se fornecido)
    codigo_acesso VARCHAR(100) NOT NULL UNIQUE, -- Código de 6-8 dígitos para login
    psicologo_id INTEGER NOT NULL,       -- Chave estrangeira para vincular ao psicólogo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_psicologo
        FOREIGN KEY(psicologo_id) 
        REFERENCES psicologos(id)
        ON DELETE CASCADE -- Se o psicólogo for deletado, seus pacientes também são.
);

-- Tabela 3: config_questionarios
-- ATUALIZADA: Adicionada a coluna 'tipo_questionario'
CREATE TABLE config_questionarios (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL UNIQUE, -- Configuração única por paciente
    frequencia_dias VARCHAR(20)[] NOT NULL, -- Array de texto: {'segunda', 'quarta', 'sexta'}
    tipo_questionario VARCHAR(100) NOT NULL, -- (ex: "questionario1", "questionario2")
    perguntas JSONB,                     -- JSONB para guardar as perguntas (que vêm do mapa de constantes)
    
    CONSTRAINT fk_paciente
        FOREIGN KEY(paciente_id)
        REFERENCES pacientes(id)
        ON DELETE CASCADE -- Se o paciente for deletado, suas configs também são.
);

-- Tabela 4: respostas_diarias
-- ATUALIZADA: Substituídas colunas por 'respostas JSONB'
CREATE TABLE respostas_diarias (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL,
    data_resposta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    respostas JSONB, -- Coluna genérica para guardar (ex: [0,1,2] ou {"humor": 5, "texto": "..."})
    
    CONSTRAINT fk_paciente
        FOREIGN KEY(paciente_id)
        REFERENCES pacientes(id)
        ON DELETE CASCADE
);

-- Tabela 5: resumos_semanais
-- Armazena o resumo do final da semana e a análise da IA.
CREATE TABLE resumos_semanais (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL,
    data_fim_semana DATE NOT NULL,
    texto_resumo TEXT NOT NULL,      -- "Como você descreveria a semana que passou?"
    texto_expectativa TEXT NOT NULL, -- "Quais são suas expectativas para a próxima?"
    analise_ia TEXT,                 -- O texto que será gerado pelo Gemini (inicialmente NULO)
    
    CONSTRAINT fk_paciente
        FOREIGN KEY(paciente_id)
        REFERENCES pacientes(id)
        ON DELETE CASCADE
);

-- ----------------------------------------------------
-- PARTE 3: ÍNDICES (para otimizar buscas)
-- ----------------------------------------------------
CREATE INDEX idx_pacientes_psicologo_id ON pacientes(psicologo_id);
CREATE INDEX idx_respostas_paciente_id ON respostas_diarias(paciente_id);
CREATE INDEX idx_resumos_paciente_id ON resumos_semanais(paciente_id);
CREATE INDEX idx_pacientes_codigo_acesso ON pacientes(codigo_acesso);