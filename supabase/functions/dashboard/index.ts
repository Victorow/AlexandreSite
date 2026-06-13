import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { getAuthUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    if (req.method !== 'GET') return errorResponse('Method not allowed', 405);

    const { user, client } = await getAuthUser(req);

    const { data, error } = await client.rpc('get_dashboard_stats', { pt_id: user.id });
    if (error) throw error;

    return jsonResponse(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    if (msg === 'Unauthorized') return errorResponse('Unauthorized', 401);
    return errorResponse(msg, 500);
  }
});
