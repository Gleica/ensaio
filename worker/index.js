const ALLOWED_ORIGINS = [
  "https://gleica.github.io",
  "http://localhost:9000",
  "http://127.0.0.1:9000",
  "http://localhost:8080",
];

const DAILY_REQUEST_LIMIT = 30; // ~3 sessões completas com todos os recursos
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

// Eventos de telemetria aceitos e o validador do respectivo metadado (quando houver).
// Mantém a chave de KV limitada a um espaço pequeno e previsível — não é possível
// gravar eventos ou metadados arbitrários.
const TRACK_META_VALIDATORS = {
  session_start: v => ["demo", "byok", "shared"].includes(v),
  scene_selected: v => /^[a-z0-9_-]{1,24}$/.test(v),
  difficulty_selected: v => ["facil", "normal", "pesadelo"].includes(v),
  msg_reached: v => /^([1-9]|[1-4][0-9])$/.test(v), // 1–49, generoso acima do limite real de 8 msgs/sessão
  coach_clicked: v => v === undefined,
  report_generated: v => v === undefined,
  guardrail_triggered: v => v === undefined,
};

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

// Contador de telemetria agregado (sem TTL — fica disponível para relatórios
// históricos). get+put não é atômico; sob concorrência alta um punhado de
// eventos pode se perder — aceitável para métricas aproximadas de produto.
async function incrementCounter(env, key) {
  const stored = await env.RATE_LIMIT_KV.get(key);
  const count = stored ? parseInt(stored, 10) : 0;
  await env.RATE_LIMIT_KV.put(key, String(count + 1));
}

async function handleTrack(request, env, origin) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Bad Request", { status: 400, headers: corsHeaders(origin) });
  }

  const { event, meta } = body ?? {};
  const validateMeta = TRACK_META_VALIDATORS[event];
  if (typeof event !== "string" || !validateMeta || !validateMeta(meta)) {
    return new Response("Bad Request", { status: 400, headers: corsHeaders(origin) });
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const key = meta !== undefined ? `an:${today}:${event}:${meta}` : `an:${today}:${event}`;
  await incrementCounter(env, key);

  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") ?? "";
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Telemetria de uso — agregada, sem PII (ver TRACK_META_VALIDATORS)
    if (url.pathname === "/v1/track" && request.method === "POST") {
      if (!ALLOWED_ORIGINS.includes(origin)) {
        return new Response("Forbidden", { status: 403 });
      }
      return handleTrack(request, env, origin);
    }

    // Rota única aceita além de /v1/track: POST /v1/messages
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
