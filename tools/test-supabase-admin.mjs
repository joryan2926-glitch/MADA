import { readFile } from "node:fs/promises";

const configSource = await readFile(new URL("../assets/js/supabase-config.js", import.meta.url), "utf8");
const url = configSource.match(/url:\s*"([^"]+)"/)?.[1];
const anonKey = configSource.match(/anonKey:\s*"([^"]+)"/)?.[1];
const email = process.env.SUPABASE_ADMIN_EMAIL;
const password = process.env.SUPABASE_ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error("Définir SUPABASE_ADMIN_EMAIL et SUPABASE_ADMIN_PASSWORD pour tester l'administration.");
}

if (!url || !anonKey) {
  throw new Error("Configuration Supabase introuvable dans assets/js/supabase-config.js.");
}

const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: {
    apikey: anonKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email, password }),
});

const authBody = await authResponse.json();
if (!authResponse.ok) {
  throw new Error(`Connexion admin impossible: ${JSON.stringify(authBody)}`);
}

const token = authBody.access_token;
const userId = authBody.user?.id;
if (!token || !userId) {
  throw new Error(`Réponse Auth Supabase incomplète: ${JSON.stringify(authBody)}`);
}
const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const readHeaders = {
  apikey: anonKey,
  Authorization: `Bearer ${token}`,
};

async function readTable(table, query = "select=id,created_at&limit=1") {
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: readHeaders,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Lecture admin ${table} échouée: ${text}`);
  }
  return text;
}

const profile = await readTable(
  "admin_profiles",
  `select=user_id,email,role,display_name&user_id=eq.${encodeURIComponent(userId)}`
);
if (profile === "[]") {
  throw new Error("Connexion réussie, mais aucun profil administrateur n'a été trouvé dans admin_profiles.");
}

const stamp = Date.now();
const postPayload = {
  title: `Test admin MADA ${stamp}`,
  slug: `test-admin-mada-${stamp}`,
  excerpt: "Actualité de test administrateur.",
  content: "Contenu de test créé par le script d'audit admin.",
  category: "Test",
  status: "published",
  published_at: new Date().toISOString(),
};

const insertPost = await fetch(`${url}/rest/v1/news_posts`, {
  method: "POST",
  headers,
  body: JSON.stringify(postPayload),
});
const inserted = await insertPost.json();
if (!insertPost.ok) {
  throw new Error(`Création actualité admin échouée: ${JSON.stringify(inserted)}`);
}
const postId = inserted[0]?.id;
if (!postId) {
  throw new Error(`Actualité créée sans identifiant exploitable: ${JSON.stringify(inserted)}`);
}

const updatePost = await fetch(`${url}/rest/v1/news_posts?id=eq.${postId}`, {
  method: "PATCH",
  headers,
  body: JSON.stringify({
    status: "draft",
    published_at: null,
  }),
});
const updated = await updatePost.json();
if (!updatePost.ok) {
  throw new Error(`Mise à jour actualité admin échouée: ${JSON.stringify(updated)}`);
}

const privateTables = [
  "memberships",
  "volunteers",
  "contacts",
  "newsletter_subscribers",
  "program_contributions",
  "local_relays",
  "donation_intents",
];

const reads = {};
for (const table of privateTables) {
  reads[table] = await readTable(table);
}

const deletePost = await fetch(`${url}/rest/v1/news_posts?id=eq.${postId}`, {
  method: "DELETE",
  headers,
});
const deleted = await deletePost.json();
if (!deletePost.ok) {
  throw new Error(`Suppression actualité admin échouée: ${JSON.stringify(deleted)}`);
}

const logout = await fetch(`${url}/auth/v1/logout`, {
  method: "POST",
  headers: readHeaders,
});
if (!logout.ok) {
  console.warn("Avertissement: déconnexion API non confirmée.");
}

console.log(`OK connexion admin: ${email}`);
console.log(`OK profil admin: ${profile}`);
console.log(`OK actualité créée, modifiée puis supprimée: ${postPayload.slug}`);
console.log("OK lecture admin des tables privées:");
for (const [table, result] of Object.entries(reads)) {
  console.log(`- ${table}: ${result}`);
}
