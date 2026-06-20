import { readFile } from "node:fs/promises";

const configSource = await readFile(new URL("../assets/js/supabase-config.js", import.meta.url), "utf8");
const url = configSource.match(/url:\s*"([^"]+)"/)?.[1];
const anonKey = configSource.match(/anonKey:\s*"([^"]+)"/)?.[1];

if (!url || url.includes("VOTRE-PROJET")) {
  throw new Error("URL Supabase manquante dans assets/js/supabase-config.js");
}

if (!anonKey || anonKey.includes("VOTRE_CLE")) {
  throw new Error("Clé publique Supabase manquante dans assets/js/supabase-config.js");
}

const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

const stamp = Date.now();
const tests = [
  {
    name: "adhésion",
    table: "memberships",
    body: {
      full_name: "Test Adhésion MADA",
      email: `test-adhesion-${stamp}@mada-martinique.fr`,
      phone: "0600000000",
      city: "Fort-de-France",
      engagement_type: "Adhérer",
      message: "Test automatisé adhésion",
      consent: true,
      source_page: "test",
      user_agent: "mada-test-script",
    },
  },
  {
    name: "bénévolat",
    table: "volunteers",
    body: {
      full_name: "Test Bénévolat MADA",
      email: `test-benevolat-${stamp}@mada-martinique.fr`,
      phone: "0600000000",
      city: "Le Lamentin",
      engagement_type: "Devenir bénévole",
      message: "Test automatisé bénévolat",
      consent: true,
      source_page: "test",
      user_agent: "mada-test-script",
    },
  },
  {
    name: "contact",
    table: "contacts",
    body: {
      full_name: "Test Contact MADA",
      email: `test-contact-${stamp}@mada-martinique.fr`,
      subject: "Question générale",
      message: "Test automatisé contact",
      consent: true,
      source_page: "test",
      user_agent: "mada-test-script",
    },
  },
  {
    name: "newsletter",
    table: "newsletter_subscribers",
    body: {
      full_name: "Test Newsletter MADA",
      email: `test-newsletter-${stamp}@mada-martinique.fr`,
      city: "Schoelcher",
      consent: true,
      source_page: "test",
      user_agent: "mada-test-script",
    },
  },
  {
    name: "contribution programme 2028",
    table: "program_contributions",
    body: {
      full_name: "Test Programme MADA",
      email: `test-programme-${stamp}@mada-martinique.fr`,
      theme: "Relance économique & Entrepreneuriat",
      proposal: "Test automatisé contribution programme",
      consent: true,
      source_page: "test",
      user_agent: "mada-test-script",
    },
  },
  {
    name: "relais communaux",
    table: "local_relays",
    body: {
      full_name: "Test Relais MADA",
      email: `test-relais-${stamp}@mada-martinique.fr`,
      city: "Le Robert",
      message: "Test automatisé relais communal",
      consent: true,
      source_page: "test",
      user_agent: "mada-test-script",
    },
  },
  {
    name: "intention de don",
    table: "donation_intents",
    body: {
      full_name: "Test Don MADA",
      email: `test-don-${stamp}@mada-martinique.fr`,
      amount: 20,
      city: "Ducos",
      message: "Test automatisé intention de don",
      consent: true,
      source_page: "test",
      user_agent: "mada-test-script",
    },
  },
];

for (const test of tests) {
  const response = await fetch(`${url}/rest/v1/${test.table}`, {
    method: "POST",
    headers,
    body: JSON.stringify(test.body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${test.name} -> ${response.status}: ${text}`);
  }
  console.log(`OK ${test.name}: insertion acceptée dans ${test.table}`);
}

console.log("Tous les tests Supabase publics sont passés.");
