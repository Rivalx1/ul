// Cloudflare Pages Function: Reverse Proxy ke Backend VPS
// Endpoint ini menangani semua request: https://nama-projek.pages.dev/api/...

export async function onRequest(context) {
  const { request, params, env } = context;

  // Handle preflight CORS request dari browser
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Ambil path yang dipanggil, misal: "menu", "kategori"
  const apiPath = Array.isArray(params.path) ? params.path.join('/') : params.path || '';
  const url = new URL(request.url);

  // Ambil URL target backend dari Environment Variable Cloudflare (atau default)
  // Anda bisa mengatur BACKEND_URL di Dashboard Cloudflare Pages > Settings > Environment variables
  const BACKEND_BASE = env.BACKEND_URL || 'https://vps-anda.com/stockopname/api';
  const targetUrl = `${BACKEND_BASE.replace(/\/$/, '')}/${apiPath}${url.search}`;

  try {
    const backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'Accept': 'application/json',
      },
    });

    const body = await backendResponse.text();

    return new Response(body, {
      status: backendResponse.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Cache-Control': 'public, max-age=10', // Cache cepat di edge Cloudflare
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Gagal terhubung ke backend VPS', detail: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
