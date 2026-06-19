const ALLOWED_ORIGINS = [
  "https://gleica.github.io",
  "http://localhost:9000",
  "http://127.0.0.1:9000",
  "http://localhost:8080",
];

const DAILY_REQUEST_LIMIT = 30; // ~3 sessões completas com todos os recursos
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, anthropic-version",
    "Access-Control-Max-Age": "86400",
  };
}

async function checkRateLimit(env, ip) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const key = `rl:${ip}:${today}`;
  const stored = await env.RATE_LIMIT_KV.get(key);
  const count = stored ? parseInt(stored, 10) : 0;
  if (count >= DAILY_REQUEST_LIMIT) return { ok: false };
  await env.RATE_LIMIT_KV.put(key, String(count + 1), { expirationTtl: 86400 });
  return { ok: true };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") ?? "";
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Rota única aceita: POST /v1/messages
    if (url.pathname !== "/v1/messages" || request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }

    // Validação de origem
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response("Forbidden", { status: 403 });
    }

    // Rate limiting por IP
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const rateLimit = await checkRateLimit(env, ip);
    if (!rateLimit.ok) {
      return new Response(
        JSON.stringify({
          error: {
            type: "rate_limit_error",
            message: "Limite diário atingido. Tente novamente amanhã ou use sua própria chave da Anthropic (botão ⚙︎).",
          },
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        }
      );
    }

    // Encaminha para a Anthropic com a chave server-side
    const body = await request.text();
    const anthropicVersion = request.headers.get("anthropic-version") ?? "2023-06-01";

    const anthropicRes = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_KEY,
        "anthropic-version": anthropicVersion,
      },
      body,
    });

    // Faz streaming da resposta de volta ao browser com headers CORS
    return new Response(anthropicRes.body, {
      status: anthropicRes.status,
      headers: {
        "content-type": anthropicRes.headers.get("content-type") ?? "application/json",
        ...corsHeaders(origin),
      },
    });
  },
};
