# Ficha por sexo: coxa medial/distal, busto, ciclo menstrual

Data: 2026-07-09

## Contexto

Pedido do usuário (via WhatsApp, repassado pelo cliente):
- Adicionar à circunferência da perna: Coxa Proximal (já existe), Coxa Medial, Coxa Distal.
- Adicionar, para mulheres: circunferência de peitoral/mamas (busto).
- Adicionar, no cadastro/avaliação: data da última menstruação e regularidade do ciclo.
- Formulário deve se adaptar automaticamente entre masculino/feminino.

Este é o primeiro dos dois pacotes de trabalho decompostos a partir do pedido original (o segundo é a Agenda de consultas, tratado em spec separada).

## Decisões (confirmadas com o usuário)

1. Coxa Medial e Coxa Distal são **campos sempre visíveis** (não há janela flutuante de escolha) para os dois lados (direito/esquerdo), ao lado da Coxa Proximal já existente.
2. Coxa Medial e Coxa Distal são **opcionais**, com a mesma regra do Antebraço: não entram na exigência de "lado completo" (que hoje cobre braço relaxado, braço contraído, coxa proximal e panturrilha).
3. Busto/Mamas é um **campo novo e único** (não bilateral), visível somente quando `aluno.gender === 'FEMALE'`, sem alterar o campo "Tórax" existente (que continua igual para os dois sexos).
4. Data da última menstruação e regularidade do ciclo são registradas **em cada avaliação física** (não no cadastro do aluno, não na anamnese) — podem variar de avaliação para avaliação.
5. A adaptação do formulário entre masculino/feminino é **automática**, baseada no `gender` já cadastrado do aluno. Não há necessidade de trocar o gênero na tela de avaliação.

## Modelo de dados

### Tabela `circunferencias` (migration)

Novas colunas, todas nullable, com `CHECK (col > 0)` igual ao padrão das colunas de membros existentes:

```sql
ALTER TABLE public.circunferencias
  ADD COLUMN right_thigh_medial_cm numeric CHECK (right_thigh_medial_cm > 0),
  ADD COLUMN left_thigh_medial_cm  numeric CHECK (left_thigh_medial_cm > 0),
  ADD COLUMN right_thigh_distal_cm numeric CHECK (right_thigh_distal_cm > 0),
  ADD COLUMN left_thigh_distal_cm  numeric CHECK (left_thigh_distal_cm > 0),
  ADD COLUMN bust_cm               numeric CHECK (bust_cm > 0);
```

### Tabela `avaliacoes` (migration)

```sql
ALTER TABLE public.avaliacoes
  ADD COLUMN last_menstruation_date date,
  ADD COLUMN menstrual_cycle_regular boolean;
```

Sem CHECK de sexo a nível de banco — a UI é responsável por só mostrar/preencher esses campos para alunas do sexo feminino; o banco aceita o dado em qualquer registro (mais simples, evita acoplar regra de negócio ao schema).

### Função `save_avaliacao`

A função hoje só existe no banco (não está em nenhuma migration commitada — divergência conhecida, ver memória `edge-function-deploy-gotchas`). Esta spec inclui uma migration que recria a função inteira via `CREATE OR REPLACE FUNCTION`, com o corpo atual + os novos campos nos blocos de INSERT e UPDATE de `avaliacoes` e `circunferencias`. Isso também corrige a divergência: a partir desta mudança, a função passa a estar versionada.

## Backend (Edge Function `avaliacoes`)

Em `supabase/functions/avaliacoes/index.ts`, `buildPayloads`:
- `p_circ` ganha `right_thigh_medial_cm`, `left_thigh_medial_cm`, `right_thigh_distal_cm`, `left_thigh_distal_cm`, `bust_cm` — todos `circumferences.<campo> ?? null`, mesmo padrão do antebraço.
- `p_avaliacao` ganha `last_menstruation_date` e `menstrual_cycle_regular` — vindos do body (`body.last_menstruation_date ?? null`, `body.menstrual_cycle_regular ?? null`), não de `circumferences` nem `bioimpedance`.

Validação de obrigatoriedade continua toda no frontend (Angular); o backend aceita os campos como opcionais, igual ao padrão atual.

## Frontend — Modelos (`data.ts`)

`Circumferences`: adiciona os 5 novos campos opcionais (`?:number`).
`Assessment`: adiciona `last_menstruation_date?: string | null` e `menstrual_cycle_regular?: boolean | null`.
`CreateAssessmentPayload` / `UpdateAssessmentPayload`: os dois novos campos de ciclo entram no nível raiz do payload (junto de `date`), não dentro de `circumferences`/`bioimpedance`.

## Frontend — Formulário (`components.ts`)

**Passo 1 (Balança Omron)** — novo bloco condicional "Saúde Feminina", visível quando `student().gender === 'FEMALE'`, com:
- Data da última menstruação (`input type="date"`, opcional).
- Ciclo regular (toggle Sim/Não/Não informado — três estados, todos válidos, sem required).

**Passo 2 (Perímetros)**:
- Grid geral: campo "Busto/Mamas" opcional, visível apenas quando `gender === 'FEMALE'`, ao lado do campo Tórax.
- Blocos "Membros Direitos/Esquerdos": cada bloco ganha "Coxa Medial" e "Coxa Distal" ao lado de "Coxa Proximal", com o mesmo estilo/opcionalidade do Antebraço.

**Validators**: `rightSideFields`/`leftSideFields` (regra de lado completo) **não mudam** — medial e distal ficam de fora, assim como antebraço.

**Prefill de edição** (`prefillForEdit`) e **submit** (`onSubmit`) são atualizados para ler/enviar os novos campos com o mesmo padrão `valor ? +valor : undefined` (perímetros) e `valor || null` (data/boolean).

## Relatório PDF (`pdf-report.ts`)

- Tabela de Circunferências: novas linhas "Coxa D. (medial)", "Coxa E. (medial)", "Coxa D. (distal)", "Coxa E. (distal)" seguindo o padrão `cRow(...)` já existente.
- Linha "Busto" só é adicionada à tabela quando `cir?.bust_cm` (ou o valor da avaliação anterior) existir — evita linha vazia para alunos homens.
- Nova mini-tabela/seção "Saúde Feminina" (data da última menstruação formatada + "Regular"/"Irregular"/"—"), renderizada apenas quando `student.gender === 'FEMALE'` e há algum dos dois campos preenchido na avaliação atual.

## Testes

- `assessment-utils.spec.ts` (ou novo spec): cobre que os novos campos opcionais de coxa não entram na regra de "lado completo" e que o payload de submit omite (`undefined`) quando vazios, igual ao antebraço.
- Testes de regressão: os specs existentes (`calculations.spec.ts`, `pdf-report.spec.ts`) continuam passando sem alteração de comportamento para avaliações sem os novos campos.

## Validação com MCP (Supabase)

Depois de aplicar a migration no projeto real (`qhdkacasbbfilqqywosj`) via `apply_migration`:
1. `list_tables` confirma as novas colunas em `circunferencias` e `avaliacoes`.
2. Chamada direta à RPC `save_avaliacao` via SQL com um aluno de teste (fluxo INSERT e depois UPDATE) confirmando que os novos campos gravam e retornam corretamente.
3. Limpeza dos dados de teste criados (delete da avaliação/aluno de teste) ao final.
4. `get_advisors` (security) para garantir que as novas colunas não introduzem problema de RLS/segurança.

## Fora de escopo

- Agenda de consultas (spec separada, próximo pacote).
- Qualquer troca manual de gênero na tela de avaliação (já confirmado como não necessário).
- Cálculos automáticos usando os novos campos (ex.: nenhuma fórmula de % de gordura passa a usar busto/medial/distal) — são apenas dados coletados e exibidos.
