import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getAuthUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, client } = await getAuthUser(req);

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const search = url.searchParams.get('search') ?? '';

      let query = client
        .from('aluno_summary')
        .select('*')
        .eq('personal_trainer_id', user.id)
        .order('name');

      if (search.trim()) {
        query = query.or(
          `name.ilike.%${search}%,goal.ilike.%${search}%,phone_number.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === 'POST') {
      const body = await req.json();

      const { name, birth_date, gender, height_cm, goal, phone_number, lgpd_consent_status, anamnesis } = body;

      if (!name || !birth_date || !gender || !height_cm) {
        return errorResponse('Campos obrigatórios: name, birth_date, gender, height_cm');
      }
      if (!['MALE', 'FEMALE'].includes(gender)) return errorResponse('gender inválido');
      if (height_cm < 50 || height_cm > 250) return errorResponse('height_cm fora do intervalo 50-250');

      const { data: aluno, error: alunoError } = await client
        .from('alunos')
        .insert({
          personal_trainer_id: user.id,
          name: name.trim(),
          birth_date,
          gender,
          height_cm,
          goal: goal ?? '',
          phone_number: phone_number ?? null,
          lgpd_consent_status: lgpd_consent_status ?? 'PENDING',
        })
        .select()
        .single();

      if (alunoError) throw alunoError;

      if (anamnesis) {
        const { error: anaError } = await client.from('anamneses').insert({
          aluno_id: aluno.id,
          cardiac_condition: anamnesis.cardiac_condition ?? false,
          joint_pain: anamnesis.joint_pain ?? false,
          chest_pain_during_exercise: anamnesis.chest_pain_during_exercise ?? false,
          recent_surgery_description: anamnesis.recent_surgery_description ?? '',
          active_medications: anamnesis.active_medications ?? '',
          notes: anamnesis.notes ?? '',
        });
        if (anaError) throw anaError;
      }

      return jsonResponse(aluno, 201);
    }

    return errorResponse('Method not allowed', 405);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    if (msg === 'Unauthorized') return errorResponse('Unauthorized', 401);
    return errorResponse(msg, 500);
  }
});
