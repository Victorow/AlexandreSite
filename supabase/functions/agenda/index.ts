import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getAuthUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, client } = await getAuthUser(req);
    const url = new URL(req.url);

    if (req.method === 'GET') {
      const date = url.searchParams.get('date') ?? new Date().toISOString().split('T')[0];
      const { data, error } = await client
        .from('agenda')
        .select('*, alunos(name)')
        .eq('personal_trainer_id', user.id)
        .eq('date', date)
        .order('time');

      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { aluno_id, date, time, focus } = body;
      if (!date || !time) return errorResponse('Campos obrigatórios: date, time');

      const { data, error } = await client
        .from('agenda')
        .insert({ personal_trainer_id: user.id, aluno_id: aluno_id ?? null, date, time, focus })
        .select()
        .single();

      if (error) throw error;
      return jsonResponse(data, 201);
    }

    if (req.method === 'DELETE') {
      const id = url.pathname.split('/').filter(Boolean).pop();
      if (!id) return errorResponse('ID não informado');
      const { error } = await client.from('agenda').delete().eq('id', id).eq('personal_trainer_id', user.id);
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
