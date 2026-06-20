-- Campo livre de observações do relatório, escrito pelo personal na tela do relatório.
-- Aparece no PDF gerado. Opcional (pode ficar vazio).
alter table public.avaliacoes add column if not exists observacoes text;
