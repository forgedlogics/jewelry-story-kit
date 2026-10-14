const origins = new Set(['https://forgedlogics.github.io', 'http://localhost:4173', 'http://127.0.0.1:4173']);
const json = (body, status, headers) => Response.json(body, {status, headers});

// One persistent counter shared by every visitor and Worker instance.
// Counts attempts before calling the paid provider, including failed attempts.
export class ImageBudget {
  constructor(state) { this.state = state; }
  async fetch(request) {
    const {limit} = await request.json();
    const allowed = await this.state.storage.transaction(async storage => {
      const day = new Date().toISOString().slice(0, 10);
      const record = await storage.get('budget');
      const count = record?.day === day ? record.count : 0;
      if (count >= limit) return false;
      await storage.put('budget', {day, count: count + 1});
      return true;
    });
    return Response.json({allowed});
  }
}

export async function handle(request, env, providerFetch = fetch) {
  const origin = request.headers.get('Origin');
  const headers = {'Cache-Control': 'no-store', 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'};
  if (origins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  if (origin && !origins.has(origin)) return json({detail:'This origin is not allowed.'}, 403, headers);
  if (request.method === 'OPTIONS') return new Response(null, {status:204, headers});
  const path = new URL(request.url).pathname;
  if (path === '/health' && request.method === 'GET') return json({ready:!!env.OPENAI_API_KEY}, 200, headers);
  if (path !== '/generate-image') return json({detail:'Not found.'}, 404, headers);
  if (request.method !== 'POST') return json({detail:'Use POST.'}, 405, headers);
  if (!env.OPENAI_API_KEY) return json({detail:'The image studio is awaiting its private API key.'}, 503, headers);
  if (!request.headers.get('Content-Type')?.includes('application/json')) return json({detail:'Send a JSON brief.'}, 415, headers);
  try {
    // Bound streamed input even when Content-Length is absent.
    const reader = request.body?.getReader();
    if (!reader) return json({detail:'Missing brief.'}, 400, headers);
    const decoder = new TextDecoder(); let body = '', bytes = 0;
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      bytes += value.length;
      if (bytes > 30000) { await reader.cancel(); return json({detail:'Brief is too large.'}, 413, headers); }
      body += decoder.decode(value, {stream:true});
    }
    body += decoder.decode();
    let input; try { input = JSON.parse(body); } catch { return json({detail:'Invalid JSON brief.'}, 400, headers); }
    if (typeof input.prompt !== 'string' || input.prompt.trim().length < 20 || input.prompt.length > 6000) return json({detail:'Provide an image brief between 20 and 6,000 characters.'}, 422, headers);
    const configuredLimit = Number(env.DAILY_IMAGE_LIMIT || 10);
    const limit = Number.isInteger(configuredLimit) && configuredLimit > 0 ? Math.min(configuredLimit, 10) : 10;
    const budget = env.IMAGE_BUDGET.get(env.IMAGE_BUDGET.idFromName('global'));
    const check = await budget.fetch('https://budget/check', {method:'POST', body:JSON.stringify({limit})});
    if (!check.ok || !(await check.json()).allowed) return json({detail:'The image studio has reached its daily generation allowance. Please try tomorrow.'}, 429, headers);
    const response = await providerFetch('https://api.openai.com/v1/images/generations', {
      method:'POST', headers:{'Content-Type':'application/json', 'Authorization':`Bearer ${env.OPENAI_API_KEY}`},
      body:JSON.stringify({model:env.IMAGE_MODEL || 'gpt-image-2', prompt:input.prompt, n:1, size:'1024x1024', quality:'low', output_format:'png'}),
      signal:AbortSignal.timeout(210000)
    });
    if (!response.ok) {
      const status = response.status; await response.body?.cancel();
      return json({detail:status === 401 ? 'The image service credentials need attention from the site owner.' : status === 429 ? 'The image provider is busy or its API credit is unavailable. Try again later.' : 'The image provider could not generate this concept. Try a different brief.'}, 502, headers);
    }
    // Stream OpenAI's base64 JSON straight to the browser. Avoid parsing a large
    // image response inside the Worker's small free-plan CPU allowance.
    return new Response(response.body, {status:200, headers:{...headers, 'Content-Type':'application/json'}});
  } catch {
    return json({detail:'The image studio is temporarily unavailable. Please try again later.'}, 502, headers);
  }
}
export default {fetch(request, env) { return handle(request, env); }};
