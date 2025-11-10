-- Limpar dados para teste fresco
DELETE FROM config_questionarios;
DELETE FROM respostas_diarias;
DELETE FROM resumos_semanais;
DELETE FROM pacientes WHERE id > 1;

-- Verificar o que restou
SELECT 'pacientes' as table_name, COUNT(*) as count FROM pacientes
UNION ALL
SELECT 'config_questionarios', COUNT(*) FROM config_questionarios
UNION ALL
SELECT 'respostas_diarias', COUNT(*) FROM respostas_diarias
UNION ALL
SELECT 'resumos_semanais', COUNT(*) FROM resumos_semanais;
