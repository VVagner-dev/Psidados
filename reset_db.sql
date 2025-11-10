-- Reset completo do banco de dados
DROP TABLE IF EXISTS resumos_semanais CASCADE;
DROP TABLE IF EXISTS respostas_diarias CASCADE;
DROP TABLE IF EXISTS config_questionarios CASCADE;
DROP TABLE IF EXISTS pacientes CASCADE;
DROP TABLE IF EXISTS psicologos CASCADE;

-- Tabela 1: psicologos
CREATE TABLE psicologos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    crp VARCHAR(50) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela 2: pacientes
CREATE TABLE pacientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    codigo_acesso VARCHAR(100) NOT NULL UNIQUE,
    psicologo_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_psicologo
        FOREIGN KEY(psicologo_id) 
        REFERENCES psicologos(id)
        ON DELETE CASCADE
);

-- Tabela 3: config_questionarios
CREATE TABLE config_questionarios (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL UNIQUE,
    frequencia_dias VARCHAR(20)[] NOT NULL,
    tipo_questionario VARCHAR(100) NOT NULL,
    perguntas JSONB,
    configuracao JSONB,
    
    CONSTRAINT fk_paciente
        FOREIGN KEY(paciente_id)
        REFERENCES pacientes(id)
        ON DELETE CASCADE
);

-- Tabela 4: respostas_diarias
CREATE TABLE respostas_diarias (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL,
    data_resposta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    respostas JSONB,
    
    CONSTRAINT fk_paciente
        FOREIGN KEY(paciente_id)
        REFERENCES pacientes(id)
        ON DELETE CASCADE
);

-- Tabela 5: resumos_semanais
CREATE TABLE resumos_semanais (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL,
    data_fim_semana DATE NOT NULL,
    texto_resumo TEXT NOT NULL,
    texto_expectativa TEXT NOT NULL,
    analise_ia TEXT,
    
    CONSTRAINT fk_paciente
        FOREIGN KEY(paciente_id)
        REFERENCES pacientes(id)
        ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_pacientes_psicologo_id ON pacientes(psicologo_id);
CREATE INDEX idx_respostas_paciente_id ON respostas_diarias(paciente_id);
CREATE INDEX idx_resumos_paciente_id ON resumos_semanais(paciente_id);
CREATE INDEX idx_pacientes_codigo_acesso ON pacientes(codigo_acesso);
