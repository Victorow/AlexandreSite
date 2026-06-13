import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getAuthUser } from '../_shared/supabase.ts';

const BUCKET = 'fotos-alunos';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, client } = await getAuthUser(req);
    const url = new URL(req.url);
    const id = url.pathname.split('/').filter(Boolean).pop();
    if (!id) return errorResponse('ID do aluno não informado');

    if (req.method === 'GET') {
      const { data: aluno, error } = await client
        .from('alunos')
        .select(`
          *,
          anamneses(*),
          avaliacoes(
            id, date, bmi, bmi_classification, body_fat_percentage, fat_mass_kg,
            lean_mass_kg, body_fat_classification, visceral_risk,
            skinfolds_fat_percentage, skinfolds_sum_mm, rcq,
            bioimpedancias(*),
            dobras_cutaneas(*),
            circunferencias(*)
          ),
          fotos(*)
        `)
        .eq('id', id)
        .eq('personal_trainer_id', user.id)
        .order('date', { referencedTable: 'avaliacoes', ascending: false })
        .order('date', { referencedTable: 'fotos', ascending: false })
        .single();

      if (error) return errorResponse('Aluno não encontrado', 404);

      // Anexa a URL pública de cada foto (o storage_path sozinho não renderiza)
      if (aluno?.fotos?.length) {
        aluno.fotos = aluno.fotos.map((foto: { storage_path: string }) => {
          const { data: { publicUrl } } = client.storage.from(BUCKET).getPublicUrl(foto.storage_path);
          return { ...foto, url: publicUrl };
        });
      }

      return jsonResponse(aluno);
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      const allowed = ['name', 'birth_date', 'gender', 'height_cm', 'goal', 'phone_number', 'lgpd_consent_status'];
      const updates: Record<string, unknown> = {};
      for (const key of allowed) {
        if (key in body) updates[key] = body[key];
      }

      const { data, error } = await client
        .from('alunos')
        .update(updates)
        .eq('id', id)
        .eq('personal_trainer_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse(data);
    }

    if (req.method === 'DELETE') {
      const { error } = await client
        .from('alunos')
        .delete()
        .eq('id', id)
        .eq('personal_trainer_id', user.id);

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
