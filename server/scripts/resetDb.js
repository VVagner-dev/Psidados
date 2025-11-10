const db = require('../config/db');

const resetDatabase = async () => {
    try {
        // Executar cada DROP
        await db.query('DROP TABLE IF EXISTS resumos_semanais CASCADE;');
        await db.query('DROP TABLE IF EXISTS respostas_diarias CASCADE;');
        await db.query('DROP TABLE IF EXISTS config_questionarios CASCADE;');
        await db.query('DROP TABLE IF EXISTS pacientes CASCADE;');
        await db.query('DROP TABLE IF EXISTS psicologos CASCADE;');

        // Criar tabela psicologos
        await db.query(`
            CREATE TABLE psicologos (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                senha_hash VARCHAR(255) NOT NULL,
                crp VARCHAR(50) UNIQUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Criar tabela pacientes
        await db.query(`
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
        `);

        // Criar tabela config_questionarios
        await db.query(`
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
        `);

        // Criar tabela respostas_diarias
        await db.query(`
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
        `);

        // Criar tabela resumos_semanais
        await db.query(`
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
        `);

        // Criar índices
        await db.query('CREATE INDEX idx_pacientes_psicologo_id ON pacientes(psicologo_id);');
        await db.query('CREATE INDEX idx_respostas_paciente_id ON respostas_diarias(paciente_id);');
        await db.query('CREATE INDEX idx_resumos_paciente_id ON resumos_semanais(paciente_id);');
        await db.query('CREATE INDEX idx_pacientes_codigo_acesso ON pacientes(codigo_acesso);');

        console.log('✅ Banco de dados resetado com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao resetar banco:', error);
        process.exit(1);
    }
};

resetDatabase();
