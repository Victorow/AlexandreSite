import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getAuthUser } from '../_shared/supabase.ts';
import {
  calcBmi, classifyBmi, classifyBodyFat, classifyVisceral,
  calcJacksonPollock7, calcRcq, calcAge,
} from '../_shared/calculations.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, client } = await getAuthUser(req);

    if (req.method === 'POST') {
      const body = await req.json();
      const { aluno_id, date, bioimpedance, circumferences, skinfolds } = body;

      if (!aluno_id || !date || !bioimpedance || !circumferences || !skinfolds) {
        return errorResponse('Campos obrigatórios: aluno_id, date, bioimpedance, circumferences, skinfolds');
      }

      // Verify ownership
      const { data: aluno, error: alunoErr } = await client
        .from('alunos')
        .select('id, gender, birth_date, height_cm')
        .eq('id', aluno_id)
        .eq('personal_trainer_id', user.id)
        .single();

      if (alunoErr || !aluno) return errorResponse('Aluno não encontrado ou sem permissão', 403);

      const age = calcAge(aluno.birth_date);
      const gender = aluno.gender as 'MALE' | 'FEMALE';

      // Calculations
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
        skinfolds.mid_thigh_mm
      );
      const skinfoldsSum = Object.values(skinfolds)
        .filter((v) => typeof v === 'number')
        .reduce((a, b) => (a as number) + (b as number), 0) as number;

      // Insert avaliacao
      const { data: avaliacao, error: avErr } = await client
        .from('avaliacoes')
        .insert({
          aluno_id,
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
        })
        .select()
        .single();

      if (avErr) throw avErr;

      // Insert bioimpedancia
      const { error: bioErr } = await client.from('bioimpedancias').insert({
        avaliacao_id: avaliacao.id,
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
      });
      if (bioErr) throw bioErr;

      // Insert dobras
      const { error: dobErr } = await client.from('dobras_cutaneas').insert({
        avaliacao_id: avaliacao.id,
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
      });
      if (dobErr) throw dobErr;

      // Insert circunferencias
      const { error: circErr } = await client.from('circunferencias').insert({
        avaliacao_id: avaliacao.id,
        neck_cm: circumferences.neck_cm,
        shoulder_cm: circumferences.shoulder_cm,
        chest_cm: circumferences.chest_cm,
        waist_cm: circumferences.waist_cm,
        abdomen_cm: circumferences.abdomen_cm,
        hip_cm: circumferences.hip_cm,
        right_arm_relaxed_cm: circumferences.right_arm_relaxed_cm,
        left_arm_relaxed_cm: circumferences.left_arm_relaxed_cm,
        right_arm_flexed_cm: circumferences.right_arm_flexed_cm,
        left_arm_flexed_cm: circumferences.left_arm_flexed_cm,
        right_forearm_cm: circumferences.right_forearm_cm ?? null,
        left_forearm_cm: circumferences.left_forearm_cm ?? null,
        right_thigh_proximal_cm: circumferences.right_thigh_proximal_cm,
        left_thigh_proximal_cm: circumferences.left_thigh_proximal_cm,
        right_calf_cm: circumferences.right_calf_cm,
        left_calf_cm: circumferences.left_calf_cm,
        rcq,
      });
      if (circErr) throw circErr;

      return jsonResponse({ ...avaliacao }, 201);
    }

    return errorResponse('Method not allowed', 405);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    if (msg === 'Unauthorized') return errorResponse('Unauthorized', 401);
    return errorResponse(msg, 500);
  }
});
