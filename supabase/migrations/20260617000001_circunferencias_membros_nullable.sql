-- Lado predominante: o personal mede só o lado dominante (braços, coxas, panturrilhas).
-- Torna nullable as 8 colunas de membros para permitir registrar apenas um lado.
-- Os CHECKs existentes (col > 0) continuam válidos: NULL satisfaz o CHECK no Postgres.
-- As medidas obrigatórias para os cálculos (peso, dobras, cintura, etc.) não são afetadas.

ALTER TABLE public.circunferencias
  ALTER COLUMN right_arm_relaxed_cm     DROP NOT NULL,
  ALTER COLUMN left_arm_relaxed_cm      DROP NOT NULL,
  ALTER COLUMN right_arm_flexed_cm      DROP NOT NULL,
  ALTER COLUMN left_arm_flexed_cm       DROP NOT NULL,
  ALTER COLUMN right_thigh_proximal_cm  DROP NOT NULL,
  ALTER COLUMN left_thigh_proximal_cm   DROP NOT NULL,
  ALTER COLUMN right_calf_cm            DROP NOT NULL,
  ALTER COLUMN left_calf_cm             DROP NOT NULL;
