import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getAuthUser } from '../_shared/supabase.ts';
import {
  calcBmi, classifyBmi, classifyBodyFat, classifyVisceral,
  calcJacksonPollock7, calcRcq, calcAge,
} from '../_shared/calculations.ts';

// deno-lint-ignore no-explicit-any
function buildPayloads(aluno: any, body: any) {
  const { date, bioimpedance, circumferences, skinfolds } = body;
  const age = calcAge(aluno.birth_date);
  const gender = aluno.gender as 'MALE' | 'FEMALE';

  const bmi = calcBmi(bioimpedance.weight_kg, aluno.height_cm);
  const fatPct = bioimpedance.body_fat_percentage;
  const fatMassKg = Math.round((bioimpedance.weight_kg * fatPct / 100) * 100) / 100;
  const leanMassKg = Math.round((bioimpedance.weight_kg - fatMassKg) * 100) / 100;
  const visceralRisk = classifyVisceral(bioimpedance.visceral_fat_level);
  const rcq = calcRcq(circumferences.waist_cm, circumferences.hip_cm);
  const skinfoldsFatPct = calcJacksonPollock7(
    gender, age,
    skinfolds.chest_mm, skinfolds.midaxillary_mm, skinfolds.triceps_mm,
    skinfolds.subscapular_mm, skinfolds.abdominal_mm, skinfolds.suprailiac_mm,
    skinfolds.mid_thigh_mm,
  );
  const skinfoldsSum = [
    skinfolds.triceps_mm, skinfolds.biceps_mm, skinfolds.subscapular_mm, skinfolds.chest_mm,
    skinfolds.midaxillary_mm, skinfolds.suprailiac_mm, skinfolds.abdominal_mm,
    skinfolds.mid_thigh_mm, skinfolds.calf_mm,
  ].reduce((a: number, b: number) => a + (Number(b) || 0), 0);

  return {
    p_avaliacao: {
      aluno_id: aluno.id,
      date,
      bmi,
      bmi_classification: classifyBmi(bmi),
      body_fat_percentage: fatPct,
      fat_mass_kg: fatMassKg,
      lean_mass_kg: leanMassKg,
      body_fat_classification: classifyBodyFat(gender, age, fatPct),
      visceral_risk: visceralRisk,
      skinfolds_fat_percentage: skinfoldsFatPct,
      skinfolds_sum_mm: skinfoldsSum,
      rcq,
    },
    p_bio: {
      perfil_bioimpedancia: bioimpedance.perfil_bioimpedancia ?? null,
      is_athlete: bioimpedance.is_athlete ?? false,
      weight_kg: bioimpedance.weight_kg,
      bmi,
      body_fat_percentage: bioimpedance.body_fat_percentage,
      skeletal_muscle_percentage: bioimpedance.skeletal_muscle_percentage,
      resting_metabolism_kcal: bioimpedance.resting_metabolism_kcal,
      body_age: bioimpedance.body_age,
      visceral_fat_level: bioimpedance.visceral_fat_level,
      water_percentage: bioimpedance.water_percentage ?? null,
      fat_mass_kg: fatMassKg,
      lean_mass_kg: leanMassKg,
    },
    p_dobras: {
      protocol: skinfolds.protocol ?? '7_dobras',
      triceps_mm: skinfolds.triceps_mm,
      biceps_mm: skinfolds.biceps_mm,
      subscapular_mm: skinfolds.subscapular_mm,
      chest_mm: skinfolds.chest_mm,
      midaxillary_mm: skinfolds.midaxillary_mm,
      suprailiac_mm: skinfolds.suprailiac_mm,
      abdominal_mm: skinfolds.abdominal_mm,
      mid_thigh_mm: skinfolds.mid_thigh_mm,
      calf_mm: skinfolds.calf_mm,
      sum_mm: skinfoldsSum,
      fat_percentage: skinfoldsFatPct,
    },
    p_circ: {
      neck_cm: circumferences.neck_cm,
      shoulder_cm: circumferences.shoulder_cm,
      chest_cm: circumferences.chest_cm,
      waist_cm: circumferences.waist_cm,
      abdomen_cm: circumferences.abdomen_cm,
      hip_cm: circumferences.hip_cm,
      right_arm_relaxed_cm: circumferences.right_arm_relaxed_cm ?? null,
      left_arm_relaxed_cm: circumferences.left_arm_relaxed_cm ?? null,
      right_arm_flexed_cm: circumferences.right_arm_flexed_cm ?? null,
      left_arm_flexed_cm: circumferences.left_arm_flexed_cm ?? null,
      right_forearm_cm: circumferences.right_forearm_cm ?? null,
      left_forearm_cm: circumferences.left_forearm_cm ?? null,
      right_thigh_proximal_cm: circumferences.right_thigh_proximal_cm ?? null,
      left_thigh_proximal_cm: circumferences.left_thigh_proximal_cm ?? null,
      right_calf_cm: circumferences.right_calf_cm ?? null,
      left_calf_cm: circumferences.left_calf_cm ?? null,
      rcq,
    },
  };
}

// Traduz erros de CHECK constraint em mensagens amigáveis
function friendlyError(msg: string): string {
  if (msg.includes('violates check constraint')) {
    if (msg.includes('circunferencias') || msg.includes('dobras') || msg.includes('weight') || msg.includes('_cm') || msg.includes('_mm')) {
      return 'Há medidas inválidas (zero ou negativas). Todas as medidas devem ser maiores que zero.';
    }
    return 'Algum valor está fora do intervalo permitido. Verifique os campos.';
  }
  return msg;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, client } = await getAuthUser(req);
    const body = await req.json();

    // ---- CRIAR ----
    if (req.method === 'POST') {
      const { aluno_id, date, bioimpedance, circumferences, skinfolds } = body;
      if (!aluno_id || !date || !bioimpedance || !circumferences || !skinfolds) {
        return errorResponse('Campos obrigatórios: aluno_id, date, bioimpedance, circumferences, skinfolds');
      }

      const { data: aluno, error: alunoErr } = await client
        .from('alunos').select('id, gender, birth_date, height_cm')
        .eq('id', aluno_id).eq('personal_trainer_id', user.id).single();
      if (alunoErr || !aluno) return errorResponse('Aluno não encontrado ou sem permissão', 403);

      const p = buildPayloads(aluno, body);
      const { data: newId, error } = await client.rpc('save_avaliacao', {
        p_avaliacao_id: null, p_avaliacao: p.p_avaliacao, p_bio: p.p_bio, p_dobras: p.p_dobras, p_circ: p.p_circ,
      });
      if (error) return errorResponse(friendlyError(error.message), 400);

      const { data: saved } = await client.from('avaliacoes').select('*').eq('id', newId).single();
      return jsonResponse(saved ?? { id: newId }, 201);
    }

    // ---- EDITAR ----
    if (req.method === 'PUT') {
      const { avaliacao_id, bioimpedance, circumferences, skinfolds } = body;
      if (!avaliacao_id || !bioimpedance || !circumferences || !skinfolds) {
        return errorResponse('Campos obrigatórios: avaliacao_id, bioimpedance, circumferences, skinfolds');
      }

      // Resolve o aluno dono desta avaliação (e valida posse via RLS no join)
      const { data: aval, error: avErr } = await client
        .from('avaliacoes')
        .select('id, date, alunos!inner(id, gender, birth_date, height_cm, personal_trainer_id)')
        .eq('id', avaliacao_id)
        .is('deleted_at', null)
        .single();
      // deno-lint-ignore no-explicit-any
      const alunoRel: any = (aval as any)?.alunos;
      if (avErr || !aval || !alunoRel || alunoRel.personal_trainer_id !== user.id) {
        return errorResponse('Avaliação não encontrada ou sem permissão', 403);
      }

      const effectiveBody = { ...body, date: body.date ?? aval.date };
      const p = buildPayloads({ id: alunoRel.id, gender: alunoRel.gender, birth_date: alunoRel.birth_date, height_cm: alunoRel.height_cm }, effectiveBody);

      const { data: updatedId, error } = await client.rpc('save_avaliacao', {
        p_avaliacao_id: avaliacao_id, p_avaliacao: p.p_avaliacao, p_bio: p.p_bio, p_dobras: p.p_dobras, p_circ: p.p_circ,
      });
      if (error) return errorResponse(friendlyError(error.message), 400);

      const { data: saved } = await client.from('avaliacoes').select('*').eq('id', updatedId).single();
      return jsonResponse(saved ?? { id: updatedId });
    }

    return errorResponse('Method not allowed', 405);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    if (msg === 'Unauthorized') return errorResponse('Unauthorized', 401);
    return errorResponse(friendlyError(msg), 500);
  }
});
