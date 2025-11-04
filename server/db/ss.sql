ALTER TABLE respostas_diarias DROP COLUMN nota_humor;
ALTER TABLE respostas_diarias DROP COLUMN reflexao_texto;
ALTER TABLE respostas_diarias ADD COLUMN respostas JSONB;