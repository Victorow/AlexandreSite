-- Amplia as categorias de foto para incluir LADO_DIREITO e LADO_ESQUERDO.
-- Mantém PERFIL para não invalidar fotos já existentes no banco.
alter table public.fotos drop constraint if exists fotos_category_check;

alter table public.fotos add constraint fotos_category_check
  check (category in ('FRENTE', 'LADO_DIREITO', 'LADO_ESQUERDO', 'COSTAS', 'PERFIL'));
