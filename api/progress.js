// api/progress.js - Vercel Serverless Function para Guardado Automático Centralizado
// Permite sincronizar automáticamente el progreso entre PC y Móvil sin contraseñas ni códigos.

export default async function handler(req, res) {
  // Cabeceras CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const STORAGE_KEY = 'suboficiales_master_progress';

  // 1. Soporte para Vercel KV / Upstash Redis (Integración Marketplace / 1-clic de Vercel)
  const kvUrl = process.env.KV_REST_API_URL || 
                process.env.UPSTASH_REDIS_REST_URL ||
                process.env.REDIS_URL_REST ||
                Object.keys(process.env).find(k => k.endsWith('_REST_API_URL')) && process.env[Object.keys(process.env).find(k => k.endsWith('_REST_API_URL'))];

  const kvToken = process.env.KV_REST_API_TOKEN || 
                  process.env.UPSTASH_REDIS_REST_TOKEN ||
                  process.env.REDIS_TOKEN_REST ||
                  Object.keys(process.env).find(k => k.endsWith('_REST_API_TOKEN')) && process.env[Object.keys(process.env).find(k => k.endsWith('_REST_API_TOKEN'))];

  // 2. Soporte para Supabase (si se configuran variables en Vercel)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    // --- MÉTODO GET: Recuperar progreso actual ---
    if (req.method === 'GET') {
      if (kvUrl && kvToken) {
        const response = await fetch(`${kvUrl}/get/${STORAGE_KEY}`, {
          headers: { Authorization: `Bearer ${kvToken}` }
        });
        if (response.ok) {
          const data = await response.json();
          const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : (data.result || null);
          return res.status(200).json({ success: true, data: parsed, source: 'vercel_kv' });
        }
      }

      if (supabaseUrl && supabaseKey) {
        const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/user_sync?sync_code=eq.master&select=*`;
        const response = await fetch(endpoint, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Accept: 'application/json'
          }
        });
        if (response.ok) {
          const rows = await response.json();
          if (rows && rows.length > 0) {
            return res.status(200).json({ success: true, data: rows[0].data, source: 'supabase' });
          }
        }
      }

      // Si no hay base de datos configurada aún en Vercel
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Almacenamiento en la nube listo para ser vinculado en Vercel Storage.'
      });
    }

    // --- MÉTODO POST: Guardar nuevo progreso ---
    if (req.method === 'POST') {
      const payload = req.body;
      if (!payload) {
        return res.status(400).json({ success: false, error: 'Datos no proporcionados' });
      }

      const cleanPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
      cleanPayload.updatedAt = new Date().toISOString();

      if (kvUrl && kvToken) {
        const response = await fetch(`${kvUrl}/set/${STORAGE_KEY}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${kvToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(cleanPayload)
        });
        if (response.ok) {
          return res.status(200).json({ success: true, savedAt: cleanPayload.updatedAt, storage: 'vercel_kv' });
        }
      }

      if (supabaseUrl && supabaseKey) {
        const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/user_sync`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            sync_code: 'master',
            data: cleanPayload,
            updated_at: cleanPayload.updatedAt
          })
        });
        if (response.ok) {
          return res.status(200).json({ success: true, savedAt: cleanPayload.updatedAt, storage: 'supabase' });
        }
      }

      return res.status(200).json({
        success: true,
        savedLocally: true,
        message: 'Guardado recibido.'
      });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error en /api/progress:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
