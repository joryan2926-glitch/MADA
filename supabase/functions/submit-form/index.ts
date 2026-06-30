import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type FormConfig = {
  allowedFields: string[];
  requiredFields: string[];
};

const DEFAULT_ALLOWED_ORIGINS = [
  "https://mada-martinique.fr",
  "https://www.mada-martinique.fr",
];

const DEFAULT_ALLOWED_HOSTNAMES = [
  "mada-martinique.fr",
  "www.mada-martinique.fr",
];

const FORM_CONFIG: Record<string, FormConfig> = {
  memberships: {
    allowedFields: ["full_name", "email", "phone", "city", "engagement_type", "message", "consent", "source_page", "user_agent"],
    requiredFields: ["full_name", "email", "consent"],
  },
  volunteers: {
    allowedFields: ["full_name", "email", "phone", "city", "engagement_type", "message", "consent", "source_page", "user_agent"],
    requiredFields: ["full_name", "email", "consent"],
  },
  newsletter_subscribers: {
    allowedFields: ["email", "city", "full_name", "consent", "source_page", "user_agent"],
    requiredFields: ["email", "consent"],
  },
  contacts: {
    allowedFields: ["full_name", "email", "subject", "message", "consent", "source_page", "user_agent"],
    requiredFields: ["full_name", "email", "message", "consent"],
  },
  program_contributions: {
    allowedFields: ["full_name", "email", "theme", "proposal", "consent", "source_page", "user_agent"],
    requiredFields: ["full_name", "email", "theme", "proposal", "consent"],
  },
  local_relays: {
    allowedFields: ["full_name", "email", "city", "message", "consent", "source_page", "user_agent"],
    requiredFields: ["full_name", "email", "city", "consent"],
  },
  commune_reports: {
    allowedFields: ["full_name", "email", "city", "issue_type", "subject", "message", "consent", "source_page", "user_agent"],
    requiredFields: ["full_name", "email", "city", "issue_type", "message", "consent"],
  },
  donation_intents: {
    allowedFields: ["full_name", "email", "amount", "city", "message", "consent", "source_page", "user_agent"],
    requiredFields: ["full_name", "email", "consent"],
  },
  project_votes: {
    allowedFields: ["full_name", "email", "project_key", "priority_level", "comment", "consent", "source_page", "user_agent"],
    requiredFields: ["full_name", "email", "project_key", "priority_level", "consent"],
  },
};

const FORM_LABELS: Record<string, string> = {
  memberships: "Adhésion",
  volunteers: "Bénévolat",
  newsletter_subscribers: "Newsletter",
  contacts: "Contact citoyen",
  program_contributions: "Contribution Programme 2028",
  local_relays: "Relais communal",
  commune_reports: "Signalement communal",
  donation_intents: "Intention de don",
  project_votes: "Vote citoyen sur projet",
};

function envList(name: string, fallback: string[]) {
  const value = Deno.env.get(name);
  if (!value) return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string | null) {
  const allowedOrigins = envList("MADA_ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS);
  const responseOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": responseOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonResponse(body: Record<string, unknown>, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function isAllowedOrigin(origin: string | null) {
  if (!origin) return false;
  return envList("MADA_ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS).includes(origin);
}

function getClientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    ""
  );
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPayloadLines(payload: Record<string, unknown>) {
  return Object.entries(payload)
    .filter(([key]) => !["user_agent"].includes(key))
    .map(([key, value]) => `${key}: ${value === null || value === undefined ? "" : String(value)}`);
}

async function sendSubmissionAlert(table: string, payload: Record<string, unknown>) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const recipients = envList("MADA_ALERT_EMAIL_TO", []);
  const from = Deno.env.get("MADA_ALERT_EMAIL_FROM");

  if (!apiKey || !from || recipients.length === 0) {
    console.warn("Email alert skipped: RESEND_API_KEY, MADA_ALERT_EMAIL_FROM or MADA_ALERT_EMAIL_TO is missing.");
    return false;
  }

  const label = FORM_LABELS[table] || table;
  const submittedAt = new Date().toLocaleString("fr-FR", { timeZone: "America/Martinique" });
  const lines = formatPayloadLines(payload);
  const subject = `Nouvelle soumission MADA - ${label}`;
  const text = [
    subject,
    "",
    `Formulaire: ${label}`,
    `Date: ${submittedAt}`,
    "",
    ...lines,
  ].join("\n");
  const htmlRows = lines
    .map((line) => {
      const separatorIndex = line.indexOf(":");
      const key = separatorIndex >= 0 ? line.slice(0, separatorIndex) : line;
      const value = separatorIndex >= 0 ? line.slice(separatorIndex + 1).trim() : "";
      return `<tr><th align="left" style="padding:8px 12px;border-bottom:1px solid #e6ece6;color:#00301c;">${escapeHtml(key)}</th><td style="padding:8px 12px;border-bottom:1px solid #e6ece6;">${escapeHtml(value)}</td></tr>`;
    })
    .join("");
  const html = `
    <div style="font-family:Arial,sans-serif;color:#102015;line-height:1.45;">
      <h1 style="margin:0 0 12px;color:#00301c;">${escapeHtml(subject)}</h1>
      <p><strong>Formulaire :</strong> ${escapeHtml(label)}</p>
      <p><strong>Date :</strong> ${escapeHtml(submittedAt)}</p>
      <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:720px;">${htmlRows}</table>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    console.error("Email alert failed:", await response.text());
    return false;
  }

  return true;
}

function cleanPayload(table: string, payload: unknown) {
  const config = FORM_CONFIG[table];
  if (!config || !payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Formulaire non autorise.");
  }

  const source = payload as Record<string, unknown>;
  const cleaned: Record<string, unknown> = {};

  for (const field of config.allowedFields) {
    if (!(field in source)) continue;
    const value = source[field];
    if (typeof value === "string") cleaned[field] = value.trim() || null;
    else if (typeof value === "boolean" || typeof value === "number" || value === null) cleaned[field] = value;
  }

  for (const field of config.requiredFields) {
    if (field === "consent") {
      if (cleaned.consent !== true) throw new Error("Consentement requis.");
      continue;
    }

    const value = cleaned[field];
    if (value === null || value === undefined || value === "") {
      throw new Error("Champ obligatoire manquant.");
    }
  }

  return cleaned;
}

async function verifyTurnstile(token: unknown, request: Request) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) throw new Error("Secret Turnstile serveur manquant.");
  if (typeof token !== "string" || token.length < 10) return false;

  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);

  const remoteIp = getClientIp(request);
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const result = await response.json();
  if (!result.success) return false;

  const hostname = String(result.hostname || "");
  const allowedHostnames = envList("TURNSTILE_ALLOWED_HOSTNAMES", DEFAULT_ALLOWED_HOSTNAMES);
  return allowedHostnames.includes(hostname);
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Methode non autorisee." }, 405, origin);
  }

  if (!isAllowedOrigin(origin)) {
    return jsonResponse({ error: "Origine non autorisee." }, 403, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Configuration serveur Supabase incomplete." }, 500, origin);
  }

  try {
    const body = await request.json();
    const table = String(body.table || "");
    const payload = cleanPayload(table, body.payload);
    const turnstileIsValid = await verifyTurnstile(body.turnstileToken, request);

    if (!turnstileIsValid) {
      return jsonResponse({ error: "Verification anti-spam invalide." }, 403, origin);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.from(table).insert(payload);

    if (error) {
      return jsonResponse({ error: error.message }, 400, origin);
    }

    const emailSent = await sendSubmissionAlert(table, payload);
    return jsonResponse({ ok: true, emailSent }, 200, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    return jsonResponse({ error: message }, 400, origin);
  }
});
