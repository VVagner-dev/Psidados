-- ----------------------------------------------------
-- Esquema do Banco de Dados para o Projeto PsiDados
-- Dialeto: PostgreSQL
-- ----------------------------------------------------

-- Tabela 1: psicologos
-- Armazena os dados de login dos profissionais.
CREATE TABLE psicologos (
    id SERIAL PRIMARY KEY,  -- Chave primária única (1, 2, 3...)
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE, -- E-mail deve ser único
    senha_hash VARCHAR(255) NOT NULL,    -- Senha SEMPRE guardada como hash (bcrypt)
    crp VARCHAR(50),                     -- Registro profissional (opcional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela 2: pacientes
-- Armazena os pacientes e os vincula aos psicólogos.
CREATE TABLE pacientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255),                  -- E-mail do paciente (opcional)
    codigo_acesso VARCHAR(100) NOT NULL UNIQUE, -- Código de 6-8 dígitos para login
    psicologo_id INTEGER NOT NULL,       -- Chave estrangeira para vincular ao psicólogo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Define a relação: pacientes.psicologo_id aponta para psicologos.id
    CONSTRAINT fk_psicologo
        FOREIGN KEY(psicologo_id) 
        REFERENCES psicologos(id)
        ON DELETE CASCADE -- Se o psicólogo for deletado, seus pacientes também são.
);

-- Tabela 3: config_questionarios
-- Define a frequência e as perguntas para CADA paciente.
CREATE TABLE config_questionarios (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL UNIQUE, -- Configuração única por paciente
    frequencia_dias VARCHAR(20)[] NOT NULL, -- Array de texto: {'segunda', 'quarta', 'sexta'}
    perguntas JSONB,                     -- JSONB é perfeito para guardar estruturas complexas
                                         -- Ex: [{'id': 1, 'tipo': 'escala', 'texto': '...'}, ...]
    
    -- Define a relação: config_questionarios.paciente_id aponta para pacientes.id
    CONSTRAINT fk_paciente
        FOREIGN KEY(paciente_id)
        REFERENCES pacientes(id)
        ON DELETE CASCADE -- Se o paciente for deletado, suas configs também são.
);

-- Tabela 4: respostas_diarias
-- Armazena cada resposta individual dos questionários diários.
CREATE TABLE respostas_diarias (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL,
    data_resposta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    nota_humor INTEGER, -- A escala de 1 a 5
    reflexao_texto TEXT, -- O texto da reflexão diária
    -- Você pode adicionar mais colunas aqui se tiver mais perguntas
    -- ex: "resposta_pergunta_2 TEXT", "resposta_pergunta_3 BOOLEAN"
    
    -- Define a relação: respostas_diarias.paciente_id aponta para pacientes.id
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
    
    -- Define a relação: resumos_semanais.paciente_id aponta para pacientes.id
    CONSTRAINT fk_paciente
        FOREIGN KEY(paciente_id)
        REFERENCES pacientes(id)
        ON DELETE CASCADE
);

-- --- Índices para otimizar buscas ---
-- Cria índices para colunas que serão muito usadas em buscas (SELECT ... WHERE ...)
CREATE INDEX idx_pacientes_psicologo_id ON pacientes(psicologo_id);
CREATE INDEX idx_respostas_paciente_id ON respostas_diarias(paciente_id);
CREATE INDEX idx_resumos_paciente_id ON resumos_semanais(paciente_id);
CREATE INDEX idx_pacientes_codigo_acesso ON pacientes(codigo_acesso);