(function () {
  const config = window.MADA_SUPABASE || {};
  const ready = config.url && config.anonKey && !config.url.includes("VOTRE-PROJET") && !config.anonKey.includes("VOTRE_CLE");
  const client = ready && window.supabase ? window.supabase.createClient(config.url, config.anonKey) : null;

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
      payload[key] = value === "on" ? true : value === "" ? null : value;
    });
    form.querySelectorAll("input[type='checkbox']").forEach((input) => {
      payload[input.name] = input.checked;
    });
    payload.source_page = window.location.pathname.split("/").pop() || "index.html";
    payload.user_agent = navigator.userAgent;
    return payload;
  }

  async function handleFormSubmit(event) {
    const form = event.target;
    if (!form.matches("[data-supabase-table]")) return;
    event.preventDefault();

    if (!client) {
      setStatus(form, "Configuration Supabase manquante. Renseignez assets/js/supabase-config.js.", "error");
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = serialize(form);
    let table = form.dataset.supabaseTable;
    if (form.dataset.engagementRouter === "true") {
      table = String(payload.engagement_type || "").toLowerCase().includes("adhérer") ? "memberships" : "volunteers";
    }
    const button = form.querySelector("button[type='submit']");
    if (button) button.disabled = true;
    setStatus(form, "Envoi en cours...", "info");

    const { error } = await client.from(table).insert(payload);
    if (button) button.disabled = false;

    if (error) {
      setStatus(form, "Erreur : " + error.message, "error");
      return;
    }

    form.reset();
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

  document.addEventListener("submit", handleFormSubmit);
  document.addEventListener("DOMContentLoaded", loadPublicNews);
})();
