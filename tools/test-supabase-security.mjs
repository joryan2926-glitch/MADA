import { readFile } from "node:fs/promises";

const configSource = await readFile(new URL("../assets/js/supabase-config.js", import.meta.url), "utf8");
const url = configSource.match(/url:\s*"([^"]+)"/)?.[1];
const anonKey = configSource.match(/anonKey:\s*"([^"]+)"/)?.[1];

const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
};

async function checkPrivateRead(table) {
  const response = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, { headers });
  const text = await response.text();
  if (!response.ok) {
    console.log(`OK lecture publique ${table}: refus HTTP ${response.status}`);
    return;
  }
  if (text === "[]") {
    console.log(`OK lecture publique ${table}: aucune donnée exposée`);
    return;
  }
  throw new Error(`ALERTE ${table}: données visibles publiquement -> ${text}`);
}

for (const table of [
  "memberships",
  "volunteers",
  "contacts",
  "newsletter_subscribers",
  "program_contributions",
  "local_relays",
  "donation_intents",
  "admin_profiles",
]) {
  await checkPrivateRead(table);
}

const news = await fetch(`${url}/rest/v1/news_posts?select=title,status&status=eq.published&limit=5`, { headers });
console.log(`Actualités publiques: HTTP ${news.status} ${await news.text()}`);

const forbiddenNewsInsert = await fetch(`${url}/rest/v1/news_posts`, {
  method: "POST",
  headers: {
    ...headers,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  body: JSON.stringify({
    title: "Test refus anonyme MADA",
    slug: `test-refus-anonyme-${Date.now()}`,
    status: "published",
  }),
});

if (forbiddenNewsInsert.ok) {
  throw new Error("ALERTE news_posts: création anonyme acceptée");
}

console.log(`OK création publique news_posts: refus HTTP ${forbiddenNewsInsert.status}`);
