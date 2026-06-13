import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getAuthUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, client } = await getAuthUser(req);
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const avaliacaoId = parts.pop();
    if (!avaliacaoId) return errorResponse('ID da avaliação não informado');

    if (req.method === 'GET') {
      const { data, error } = await client
        .from('avaliacoes')
        .select(`
          *,
          bioimpedancias(*),
          dobras_cutaneas(*),
          circunferencias(*),
          alunos!inner(id, name, birth_date, gender, height_cm, phone_number, personal_trainer_id)
        `)
        .eq('id', avaliacaoId)
        .eq('alunos.personal_trainer_id', user.id)
        .single();

      if (error) return errorResponse('Avaliação não encontrada', 404);
      return jsonResponse(data);
    }

    if (req.method === 'DELETE') {
      // Verify ownership via join
      const { data: av, error: checkErr } = await client
        .from('avaliacoes')
        .select('id, alunos!inner(personal_trainer_id)')
        .eq('id', avaliacaoId)
        .eq('alunos.personal_trainer_id', user.id)
        .single();

      if (checkErr || !av) return errorResponse('Avaliação não encontrada ou sem permissão', 403);

      const { error } = await client.from('avaliacoes').delete().eq('id', avaliacaoId);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    if (msg === 'Unauthorized') return errorResponse('Unauthorized', 401);
    return errorResponse(msg, 500);
  }
});
