import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getAuthUser, getSupabaseAdmin } from '../_shared/supabase.ts';

const BUCKET = 'fotos-alunos';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, client } = await getAuthUser(req);
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);

    if (req.method === 'POST') {
      const body = await req.json();
      const { aluno_id, date, category, image_base64, mime_type } = body;

      if (!aluno_id || !date || !category || !image_base64) {
        return errorResponse('Campos obrigatórios: aluno_id, date, category, image_base64');
      }
      if (!['FRENTE', 'PERFIL', 'COSTAS'].includes(category)) {
        return errorResponse('category inválida. Use: FRENTE, PERFIL ou COSTAS');
      }

      // Verify ownership
      const { error: alunoErr } = await client
        .from('alunos')
        .select('id')
        .eq('id', aluno_id)
        .eq('personal_trainer_id', user.id)
        .single();

      if (alunoErr) return errorResponse('Aluno não encontrado ou sem permissão', 403);

      // Upload to Supabase Storage
      const admin = getSupabaseAdmin();
      const ext = mime_type === 'image/png' ? 'png' : 'jpg';
      const storagePath = `${user.id}/${aluno_id}/${date}_${category}_${Date.now()}.${ext}`;
      const imageBuffer = Uint8Array.from(atob(image_base64), (c) => c.charCodeAt(0));

      const { error: uploadErr } = await admin.storage
        .from(BUCKET)
        .upload(storagePath, imageBuffer, {
          contentType: mime_type ?? 'image/jpeg',
          upsert: false,
        });

      if (uploadErr) throw uploadErr;

      const { data: foto, error: fotoErr } = await client
        .from('fotos')
        .insert({ aluno_id, date, category, storage_path: storagePath })
        .select()
        .single();

      if (fotoErr) throw fotoErr;

      // Return public URL
      const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
      return jsonResponse({ ...foto, url: publicUrl }, 201);
    }

    if (req.method === 'DELETE') {
      const fotoId = parts.pop();
      if (!fotoId) return errorResponse('ID da foto não informado');

      const { data: foto, error: findErr } = await client
        .from('fotos')
        .select('id, storage_path, aluno_id, alunos!inner(personal_trainer_id)')
        .eq('id', fotoId)
        .eq('alunos.personal_trainer_id', user.id)
        .single();

      if (findErr || !foto) return errorResponse('Foto não encontrada ou sem permissão', 403);

      const admin = getSupabaseAdmin();
      await admin.storage.from(BUCKET).remove([foto.storage_path]);

      const { error } = await client.from('fotos').delete().eq('id', fotoId);
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
