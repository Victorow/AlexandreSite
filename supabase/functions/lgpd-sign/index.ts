import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getAuthUser, getSupabaseAdmin } from '../_shared/supabase.ts';

const BUCKET = 'lgpd-assinaturas';
const TERM_VERSION = '1.0';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user, client } = await getAuthUser(req);
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);

    // GET /lgpd-sign/:alunoId — verifica se já tem assinatura
    if (req.method === 'GET') {
      const alunoId = parts.pop();
      if (!alunoId) return errorResponse('ID do aluno não informado');

      const { data, error } = await client
        .from('lgpd_assinaturas')
        .select('id, signed_at, signature_url, term_version')
        .eq('aluno_id', alunoId)
        .single();

      if (error) return jsonResponse({ signed: false });
      return jsonResponse({ signed: true, ...data });
    }

    // POST /lgpd-sign — salva assinatura
    if (req.method === 'POST') {
      const body = await req.json();
      const { aluno_id, signature_base64 } = body;

      if (!aluno_id || !signature_base64) {
        return errorResponse('Campos obrigatórios: aluno_id, signature_base64');
      }

      // Verifica propriedade
      const { error: alunoErr } = await client
        .from('alunos')
        .select('id')
        .eq('id', aluno_id)
        .eq('personal_trainer_id', user.id)
        .single();

      if (alunoErr) return errorResponse('Aluno não encontrado ou sem permissão', 403);

      // Valida que a assinatura não está vazia (deve ser PNG base64 não trivial)
      if (signature_base64.length < 100) {
        return errorResponse('Assinatura inválida ou em branco');
      }

      const admin = getSupabaseAdmin();
      const storagePath = `${user.id}/${aluno_id}/assinatura_lgpd_v${TERM_VERSION}_${Date.now()}.png`;
      const imageBuffer = Uint8Array.from(atob(signature_base64), (c) => c.charCodeAt(0));

      // Upload da assinatura (bucket privado)
      const { error: uploadErr } = await admin.storage
        .from(BUCKET)
        .upload(storagePath, imageBuffer, { contentType: 'image/png', upsert: true });

      if (uploadErr) throw uploadErr;

      // Gera URL assinada (válida por 10 anos)
      const { data: signedUrlData, error: urlErr } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10);

      if (urlErr) throw urlErr;

      // Upsert na tabela (UNIQUE em aluno_id — substitui se já existir)
      const { data: lgpd, error: lgpdErr } = await client
        .from('lgpd_assinaturas')
        .upsert({
          aluno_id,
          signature_storage_path: storagePath,
          signature_url: signedUrlData.signedUrl,
          term_version: TERM_VERSION,
          signed_at: new Date().toISOString(),
        }, { onConflict: 'aluno_id' })
        .select()
        .single();

      if (lgpdErr) throw lgpdErr;

      // Atualiza status LGPD do aluno
      const { error: updateErr } = await client
        .from('alunos')
        .update({ lgpd_consent_status: 'ACCEPTED' })
        .eq('id', aluno_id)
        .eq('personal_trainer_id', user.id);

      if (updateErr) throw updateErr;

      return jsonResponse({
        success: true,
        signed_at: lgpd.signed_at,
        term_version: lgpd.term_version,
        signature_url: lgpd.signature_url,
      }, 201);
    }

    return errorResponse('Method not allowed', 405);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    if (msg === 'Unauthorized') return errorResponse('Unauthorized', 401);
    return errorResponse(msg, 500);
  }
});
