(function () {
  const config = window.MADA_SUPABASE || {};
  const ready = config.url && config.anonKey && !config.url.includes("VOTRE-PROJET") && !config.anonKey.includes("VOTRE_CLE");
  const client = ready && window.supabase ? window.supabase.createClient(config.url, config.anonKey) : null;
  const turnstileConfig = window.MADA_TURNSTILE || {};
  const TURNSTILE_SITE_KEY = turnstileConfig.siteKey || "0x4AAAAAADopHOCEnvKcciaG";
  const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  const FORM_FUNCTION_URL = ready ? `${config.url}/functions/v1/submit-form` : "";
  const turnstileTokens = new WeakMap();
  const turnstileWidgetIds = new WeakMap();
  let turnstileScriptPromise = null;

  function setStatus(form, message, type) {
    let status = form.querySelector("[data-form-status]");
    if (!status) {
      status = document.createElement("p");
      status.className = "form-status";
      status.setAttribute("data-form-status", "");
      form.appendChild(status);
    }
    status.textContent = message;
    status.dataset.type = type || "info";
  }

  function serialize(form) {
    const formData = new FormData(form);
    const payload = {};
    formData.forEach((value, key) => {
      if (key === "cf-turnstile-response") return;
      payload[key] = value === "on" ? true : value === "" ? null : value;
    });
    form.querySelectorAll("input[type='checkbox']").forEach((input) => {
      payload[input.name] = input.checked;
    });
    payload.source_page = window.location.pathname.split("/").pop() || "index.html";
    payload.user_agent = navigator.userAgent;
    return payload;
  }

  function isTurnstileConfigured() {
    return TURNSTILE_SITE_KEY && !TURNSTILE_SITE_KEY.includes("VOTRE_CLE");
  }

  function loadTurnstileScript() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (turnstileScriptPromise) return turnstileScriptPromise;

    turnstileScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(window.turnstile));
        existing.addEventListener("error", reject);
        return;
      }

      const script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", () => resolve(window.turnstile));
      script.addEventListener("error", reject);
      document.head.appendChild(script);
    });

    return turnstileScriptPromise;
  }

  function createTurnstileContainer(form) {
    let container = form.querySelector("[data-turnstile-container]");
    if (container) return container;

    container = document.createElement("div");
    container.className = "turnstile-field";
    container.setAttribute("data-turnstile-container", "");
    container.setAttribute("aria-label", "Vérification anti-spam");

    const note = document.createElement("p");
    note.className = "form-note";
    note.textContent = "Vérification anti-spam";
    container.appendChild(note);

    const widget = document.createElement("div");
    widget.className = "turnstile-widget";
    widget.setAttribute("data-turnstile-widget", "");
    container.appendChild(widget);

    const submitButton = form.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.insertAdjacentElement("beforebegin", container);
    } else {
      form.appendChild(container);
    }

    return container;
  }

  async function setupTurnstile(form) {
    if (!form.matches("[data-supabase-table]")) return;
    const container = createTurnstileContainer(form);
    const widget = container.querySelector("[data-turnstile-widget]");

    if (!isTurnstileConfigured()) {
      widget.innerHTML = '<p class="turnstile-warning">Protection anti-spam à configurer.</p>';
      return;
    }

    try {
      const turnstile = await loadTurnstileScript();
      if (!turnstile || turnstileWidgetIds.has(form)) return;
      const widgetId = turnstile.render(widget, {
        sitekey: TURNSTILE_SITE_KEY,
        callback(token) {
          turnstileTokens.set(form, token);
        },
        "expired-callback"() {
          turnstileTokens.delete(form);
        },
        "error-callback"() {
          turnstileTokens.delete(form);
          setStatus(form, "La vérification anti-spam a échoué. Veuillez réessayer.", "error");
        },
      });
      turnstileWidgetIds.set(form, widgetId);
    } catch (error) {
      widget.innerHTML = '<p class="turnstile-warning">Vérification anti-spam indisponible.</p>';
    }
  }

  function resetTurnstile(form) {
    turnstileTokens.delete(form);
    const widgetId = turnstileWidgetIds.get(form);
    if (window.turnstile && widgetId !== undefined) {
      window.turnstile.reset(widgetId);
    }
  }

  function validateTurnstile(form) {
    if (!isTurnstileConfigured()) {
      setStatus(form, "Protection anti-spam non configurée. Renseignez la clé site Cloudflare Turnstile.", "error");
      return false;
    }

    if (!turnstileTokens.get(form)) {
      setStatus(form, "Veuillez valider la vérification anti-spam avant l'envoi.", "error");
      return false;
    }

    return true;
  }

  async function submitSecureForm(table, payload, turnstileToken) {
    const response = await fetch(FORM_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
      body: JSON.stringify({
        table,
        payload,
        turnstileToken,
      }),
    });

    let result = {};
    try {
      result = await response.json();
    } catch (error) {
      result = {};
    }

    if (!response.ok) {
      return { error: new Error(result.error || "Erreur serveur.") };
    }

    return { error: null };
  }

  function shouldUseFallback(error) {
    const message = String(error?.message || "").toLowerCase();
    return message.includes("formulaire non autorise")
      || message.includes("formulaire non autorisé")
      || message.includes("relation")
      || message.includes("does not exist")
      || message.includes("schema cache");
  }

  function buildFallbackPayload(table, payload) {
    if (table !== "contacts") return payload;

    const subjectParts = [
      payload.city ? `Commune : ${payload.city}` : "",
      payload.issue_type ? `Enjeu : ${payload.issue_type}` : "",
      payload.subject ? `Sujet : ${payload.subject}` : "",
    ].filter(Boolean);
    const messageParts = [
      "Signalement communal",
      payload.city ? `Commune : ${payload.city}` : "",
      payload.issue_type ? `Type d'enjeu : ${payload.issue_type}` : "",
      payload.subject ? `Sujet : ${payload.subject}` : "",
      "",
      payload.message || "",
    ].filter((line, index) => line !== "" || index === 4);

    return {
      full_name: payload.full_name,
      email: payload.email,
      subject: subjectParts.join(" - ") || "Signalement communal",
      message: messageParts.join("\n"),
      consent: payload.consent,
      source_page: payload.source_page,
      user_agent: payload.user_agent,
    };
  }

  async function handleFormSubmit(event) {
    const form = event.target;
    if (!form.matches("[data-supabase-table]")) return;
    event.preventDefault();

    if (!ready) {
      setStatus(form, "Configuration Supabase manquante. Renseignez assets/js/supabase-config.js.", "error");
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    await setupTurnstile(form);
    if (!validateTurnstile(form)) return;
    const turnstileToken = turnstileTokens.get(form);

    const payload = serialize(form);
    let table = form.dataset.supabaseTable;
    if (form.dataset.engagementRouter === "true") {
      table = String(payload.engagement_type || "").toLowerCase().includes("adhérer") ? "memberships" : "volunteers";
    }
    const button = form.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    setStatus(form, "Envoi en cours...", "info");

    let { error } = await submitSecureForm(table, payload, turnstileToken);
    if (error && form.dataset.fallbackTable && shouldUseFallback(error)) {
      const fallbackTable = form.dataset.fallbackTable;
      const fallbackPayload = buildFallbackPayload(fallbackTable, payload);
      ({ error } = await submitSecureForm(fallbackTable, fallbackPayload, turnstileToken));
    }
    if (button) button.disabled = false;

    if (error) {
      resetTurnstile(form);
      setStatus(form, "Erreur : " + error.message, "error");
      return;
    }

    form.reset();
    resetTurnstile(form);
    setStatus(form, "Merci. Votre demande a bien été enregistrée.", "success");
  }

  function renderPost(post) {
    const article = document.createElement("article");
    article.className = "card";
    const date = post.published_at ? new Date(post.published_at).toLocaleDateString("fr-FR") : "MADA";
    article.innerHTML = `
      <p class="article-meta">${post.category || "Actualité"} - ${date}</p>
      <h3>${escapeHtml(post.title || "")}</h3>
      <p>${escapeHtml(post.excerpt || "")}</p>
      ${post.slug ? `<div class="cta-row"><a class="btn btn-line" href="actualites.html#${escapeHtml(post.slug)}">Lire</a></div>` : ""}
    `;
    return article;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function loadPublicNews() {
    const target = document.querySelector("[data-news-list]");
    if (!target || !client) return;
    const { data, error } = await client
      .from("news_posts")
      .select("title, slug, excerpt, category, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(6);
    if (error || !data || data.length === 0) return;
    target.innerHTML = "";
    data.forEach((post) => target.appendChild(renderPost(post)));
  }

  function setTextList(target, rows, renderer) {
    if (!target || !rows || rows.length === 0) return;
    target.innerHTML = "";
    rows.forEach((row) => target.appendChild(renderer(row)));
  }

  async function loadObservatoryIndicators() {
    const target = document.querySelector("[data-observatory-list]");
    if (!target || !client) return;
    const { data, error } = await client
      .from("territory_indicators")
      .select("label, category, value, unit, period, trend, description")
      .eq("status", "published")
      .order("display_order", { ascending: true });
    if (error) return;
    setTextList(target, data, (indicator) => {
      const article = document.createElement("article");
      article.className = "metric-card";
      article.innerHTML = `
        <p class="article-meta">${escapeHtml(indicator.category || "Indicateur")}</p>
        <h3>${escapeHtml(indicator.label || "")}</h3>
        <strong>${escapeHtml(indicator.value || "À renseigner")}${indicator.unit ? ` ${escapeHtml(indicator.unit)}` : ""}</strong>
        <p>${escapeHtml(indicator.description || "Donnée actualisable depuis Supabase.")}</p>
        <span>${escapeHtml(indicator.period || "Période à préciser")}${indicator.trend ? ` - ${escapeHtml(indicator.trend)}` : ""}</span>
      `;
      return article;
    });
  }

  async function loadDocuments() {
    const target = document.querySelector("[data-documents-list]");
    if (!target || !client) return;
    const { data, error } = await client
      .from("documents_library")
      .select("title, document_type, summary, file_url, related_project, published_at")
      .eq("status", "published")
      .order("display_order", { ascending: true })
      .order("published_at", { ascending: false });
    if (error) return;
    setTextList(target, data, (documentItem) => {
      const article = document.createElement("article");
      article.className = "card";
      article.innerHTML = `
        <p class="article-meta">${escapeHtml(documentItem.document_type || "Document")}</p>
        <h3>${escapeHtml(documentItem.title || "")}</h3>
        <p>${escapeHtml(documentItem.summary || "")}</p>
        ${documentItem.related_project ? `<p class="form-note">${escapeHtml(documentItem.related_project)}</p>` : ""}
        ${documentItem.file_url ? `<div class="cta-row"><a class="btn btn-line" href="${escapeHtml(documentItem.file_url)}">Télécharger</a></div>` : ""}
      `;
      return article;
    });
  }

  async function loadTeamProfiles() {
    const target = document.querySelector("[data-team-profiles]");
    if (!target || !client) return;
    const { data, error } = await client
      .from("team_profiles")
      .select("full_name, role_title, team_area, city, biography, skills, photo_url")
      .eq("status", "published")
      .order("display_order", { ascending: true });
    if (error) return;
    setTextList(target, data, (profile) => {
      const article = document.createElement("article");
      article.className = "profile-card";
      article.innerHTML = `
        <img src="${escapeHtml(profile.photo_url || "assets/mada-logo-reference-480.webp")}" alt="${escapeHtml(profile.full_name || "Profil MADA")}" loading="lazy" decoding="async">
        <div>
          <p class="article-meta">${escapeHtml(profile.role_title || "Équipe MADA")}</p>
          <h3>${escapeHtml(profile.full_name || "Profil à compléter")}</h3>
          <p>${escapeHtml(profile.biography || "Biographie à publier depuis Supabase.")}</p>
          <span>${escapeHtml(profile.skills || profile.team_area || "Compétences à préciser")}</span>
          <strong>Commune : ${escapeHtml(profile.city || "à préciser")}</strong>
        </div>
      `;
      return article;
    });
  }

  async function loadProjectProgress() {
    const target = document.querySelector("[data-project-progress]");
    if (!target || !client) return;
    const { data, error } = await client
      .from("project_progress")
      .select("project_key, project_title, phase, progress_percent, next_milestone")
      .eq("status", "published")
      .order("project_title", { ascending: true });
    if (error) return;
    setTextList(target, data, (project) => {
      const article = document.createElement("article");
      article.className = "progress-card";
      const progress = Math.max(0, Math.min(100, Number(project.progress_percent) || 0));
      article.innerHTML = `
        <h3>${escapeHtml(project.project_title || "")}</h3>
        <p>${escapeHtml(project.phase || "Phase à renseigner")}</p>
        <div class="progress-track"><span style="width: ${progress}%"></span></div>
        <strong>${progress}%</strong>
        <p>${escapeHtml(project.next_milestone || "Prochaine étape à préciser.")}</p>
      `;
      return article;
    });
  }

  async function loadCommuneProfiles() {
    const target = document.querySelector("[data-commune-profiles]");
    if (!target || !client) return;
    const { data, error } = await client
      .from("commune_profiles")
      .select("city, territory_area, diagnostic, needs, proposed_projects, local_referent, contributions_summary")
      .eq("status", "published")
      .order("city", { ascending: true });
    if (error) return;
    setTextList(target, data, (commune) => {
      const article = document.createElement("article");
      article.className = "commune-profile-card";
      article.innerHTML = `
        <h3>${escapeHtml(commune.city || "")}</h3>
        <p class="article-meta">${escapeHtml(commune.territory_area || "Commune")}</p>
        <p><strong>Diagnostic :</strong> ${escapeHtml(commune.diagnostic || "À compléter.")}</p>
        <p><strong>Besoins remontés :</strong> ${escapeHtml(commune.needs || "À compléter.")}</p>
        <p><strong>Projets proposés :</strong> ${escapeHtml(commune.proposed_projects || "À compléter.")}</p>
        <p><strong>Référent :</strong> ${escapeHtml(commune.local_referent || "À désigner")}</p>
        <p><strong>Contributions :</strong> ${escapeHtml(commune.contributions_summary || "En attente de contributions citoyennes.")}</p>
      `;
      return article;
    });
  }

  document.addEventListener("submit", handleFormSubmit);
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("form[data-supabase-table]").forEach((form) => {
      setupTurnstile(form);
    });
    loadPublicNews();
    loadObservatoryIndicators();
    loadDocuments();
    loadTeamProfiles();
    loadProjectProgress();
    loadCommuneProfiles();
  });
})();
