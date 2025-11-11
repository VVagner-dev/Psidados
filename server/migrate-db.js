const db = require('./config/db');

async function migrateDatabase() {
  try {
    console.log('📝 [MIGRATE] Iniciando migrações do banco de dados...\n');
    
    // Verificar se as colunas já existem
    const checkResult = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'resumos_semanais' 
      AND column_name IN ('resumo_geral', 'analise_pontos', 'analises_questionarios');
    `);
    
    const existingColumns = checkResult.rows.map(r => r.column_name);
    console.log(`ℹ️  Colunas já existentes:`, existingColumns.length > 0 ? existingColumns.join(', ') : 'nenhuma');
    
    // Adicionar resumo_geral se não existir
    if (!existingColumns.includes('resumo_geral')) {
      console.log('  ➕ Adicionando coluna: resumo_geral...');
      await db.query('ALTER TABLE resumos_semanais ADD COLUMN resumo_geral TEXT;');
      console.log('  ✅ resumo_geral adicionada');
    }
    
    // Adicionar analise_pontos se não existir
    if (!existingColumns.includes('analise_pontos')) {
      console.log('  ➕ Adicionando coluna: analise_pontos...');
      await db.query('ALTER TABLE resumos_semanais ADD COLUMN analise_pontos TEXT;');
      console.log('  ✅ analise_pontos adicionada');
    }
    
    // Adicionar analises_questionarios se não existir
    if (!existingColumns.includes('analises_questionarios')) {
      console.log('  ➕ Adicionando coluna: analises_questionarios...');
      await db.query('ALTER TABLE resumos_semanais ADD COLUMN analises_questionarios JSONB;');
      console.log('  ✅ analises_questionarios adicionada');
    }
    
    if (existingColumns.length === 3) {
      console.log('\n✅ Banco de dados já está atualizado! Nenhuma migração necessária.\n');
    } else {
      console.log('\n✅ Migrações executadas com sucesso!\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao migrar banco de dados:');
    console.error(`   ${error.message}\n`);
    console.error('💡 Dica: Se o erro é "column already exists", significa que o banco já foi migrado.');
    console.error('    Você pode ignorar este erro e continuar.\n');
    process.exit(1);
  }
}

migrateDatabase();
