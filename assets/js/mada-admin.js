(function () {
  const config = window.MADA_SUPABASE || {};
  const ready = config.url && config.anonKey && !config.url.includes("VOTRE-PROJET") && !config.anonKey.includes("VOTRE_CLE");
  const client = ready && window.supabase ? window.supabase.createClient(config.url, config.anonKey) : null;
  const submissionCache = new Map();

  const loginForm = document.querySelector("[data-admin-login]");
  const postForm = document.querySelector("[data-admin-post]");
  const logoutButton = document.querySelector("[data-admin-logout]");
  const status = document.querySelector("[data-admin-status]");
  const list = document.querySelector("[data-admin-news-list]");
  const submissions = document.querySelector("[data-admin-submissions]");
  const app = document.querySelector("[data-admin-app]");

  function message(text, type) {
    if (!status) return;
    status.textContent = text;
    status.dataset.type = type || "info";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function slugify(value) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function setAdminVisible(visible) {
    if (app) app.hidden = !visible;
    if (loginForm) loginForm.hidden = visible;
  }

  async function getAdminProfile(session) {
    if (!session?.user?.id) return null;
    const { data, error } = await client
      .from("admin_profiles")
      .select("user_id, email, role, display_name")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      message("Vérification administrateur impossible : " + error.message, "error");
      return null;
    }
    return data;
  }

  async function refreshSession(successMessage) {
    if (!client) {
      message("Configuration Supabase manquante. Renseignez assets/js/supabase-config.js.", "error");
      return;
    }
    const { data } = await client.auth.getSession();
    if (!data.session) {
      setAdminVisible(false);
      message("Connexion administrateur requise.", "info");
      return;
    }

    const profile = await getAdminProfile(data.session);
    if (!profile) {
      await client.auth.signOut();
      setAdminVisible(false);
      message("Accès refusé : ce compte n'est pas administrateur MADA.", "error");
      return;
    }

    setAdminVisible(true);
    message(successMessage || `Session administrateur active : ${profile.email}.`, "success");
    await Promise.all([loadPosts(), loadSubmissions()]);
  }

  async function loadPosts() {
    const { data, error } = await client
      .from("news_posts")
      .select("id, title, slug, status, category, published_at")
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) {
      message(error.message, "error");
      return;
    }
    list.innerHTML = "";
    if (!data || data.length === 0) {
      const item = document.createElement("li");
      item.textContent = "Aucune actualité enregistrée pour le moment.";
      list.appendChild(item);
      return;
    }
    data.forEach((post) => {
      const item = document.createElement("li");
      const meta = [
        post.category || "Actualité",
        post.status === "published" ? "Publié" : "Brouillon",
        post.published_at ? new Date(post.published_at).toLocaleDateString("fr-FR") : "",
      ].filter(Boolean).join(" - ");
      item.innerHTML = `
        <div class="admin-item-main">
          <strong>${escapeHtml(post.title)}</strong>
          <span>${escapeHtml(meta)}</span>
        </div>
        <div class="admin-actions">
          <button type="button" class="btn btn-line admin-small-button" data-news-action="${post.status === "published" ? "draft" : "published"}" data-news-id="${post.id}">
            ${post.status === "published" ? "Passer en brouillon" : "Publier"}
          </button>
          <button type="button" class="btn btn-line admin-small-button" data-news-action="delete" data-news-id="${post.id}">Supprimer</button>
        </div>
      `;
      list.appendChild(item);
    });
  }

  async function loadSubmissions() {
    if (!submissions) return;
    const sources = [
      { table: "memberships", label: "Adhésions", columns: "id, created_at, full_name, email, phone, city, engagement_type, message" },
      { table: "volunteers", label: "Bénévoles", columns: "id, created_at, full_name, email, phone, city, engagement_type, message" },
      { table: "newsletter_subscribers", label: "Newsletter", columns: "id, created_at, full_name, email, city" },
      { table: "contacts", label: "Contacts", columns: "id, created_at, full_name, email, subject, message" },
      { table: "program_contributions", label: "Contributions programme", columns: "id, created_at, full_name, email, theme, proposal" },
      { table: "local_relays", label: "Relais communaux", columns: "id, created_at, full_name, email, city, message" },
      { table: "donation_intents", label: "Intentions de don", columns: "id, created_at, full_name, email, amount, city, message" },
      { table: "project_votes", label: "Votes citoyens", columns: "id, created_at, full_name, email, project_key, priority_level, comment" },
      { table: "territory_indicators", label: "Observatoire", columns: "id, updated_at, label, category, value, unit, period, status" },
      { table: "team_profiles", label: "Équipe & gouvernance", columns: "id, updated_at, full_name, role_title, team_area, city, status" },
      { table: "documents_library", label: "Documentation", columns: "id, published_at, title, document_type, related_project, status" },
      { table: "commune_profiles", label: "Fiches communales", columns: "id, updated_at, city, territory_area, local_referent, status" },
      { table: "project_progress", label: "Avancement projets", columns: "id, updated_at, project_title, phase, progress_percent, status" },
    ];
    submissions.innerHTML = "";
    for (const source of sources) {
      const { data, error } = await client
        .from(source.table)
        .select(source.columns)
        .order("created_at", { ascending: false })
        .limit(50);
      const section = document.createElement("section");
      section.className = "admin-submission-group";
      const rows = data || [];
      submissionCache.set(source.table, { label: source.label, rows });
      section.innerHTML = `
        <div class="admin-group-header">
          <h3>${escapeHtml(source.label)}</h3>
          <button type="button" class="btn btn-line admin-small-button" data-export-table="${source.table}">Exporter CSV</button>
        </div>
      `;
      if (error) {
        section.innerHTML += `<p>${escapeHtml(error.message)}</p>`;
      } else if (rows.length === 0) {
        section.innerHTML += "<p>Aucune demande pour le moment.</p>";
      } else {
        const ul = document.createElement("ul");
        ul.className = "admin-news-list";
        rows.forEach((row) => {
          const item = document.createElement("li");
          const detail = row.engagement_type || row.theme || row.subject || row.city || row.amount || row.project_key || row.category || row.team_area || row.document_type || row.phase || "";
          const primary = row.full_name || row.email || row.title || row.label || row.project_title || row.role_title || row.city || row.id || "";
          const dateValue = row.created_at || row.updated_at || row.published_at;
          const date = dateValue ? new Date(dateValue).toLocaleString("fr-FR") : "";
          item.innerHTML = `
            <strong>${escapeHtml(primary)}</strong>
            <span>${row.email ? escapeHtml(row.email) : ""}${detail ? " - " + escapeHtml(detail) : ""}${date ? " - " + escapeHtml(date) : ""}</span>
          `;
          ul.appendChild(item);
        });
        section.appendChild(ul);
      }
      submissions.appendChild(section);
    }
  }

  function downloadCsv(table) {
    const cached = submissionCache.get(table);
    if (!cached || cached.rows.length === 0) {
      message("Aucune donnée à exporter pour cette rubrique.", "error");
      return;
    }
    const columns = Array.from(cached.rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set()));
    const csv = [
      columns.join(","),
      ...cached.rows.map((row) => columns.map((column) => csvValue(row[column])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `mada-${table}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  }

  function csvValue(value) {
    if (value === null || value === undefined) return "";
    return `"${String(value).replace(/"/g, '""')}"`;
  }

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client) {
      message("Configuration Supabase manquante. Renseignez assets/js/supabase-config.js.", "error");
      return;
    }
    const formData = new FormData(loginForm);
    const { error } = await client.auth.signInWithPassword({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (error) {
      message(error.message, "error");
      return;
    }
    refreshSession("Connexion réussie. Vérification du profil administrateur terminée.");
  });

  logoutButton?.addEventListener("click", async () => {
    await client.auth.signOut();
    setAdminVisible(false);
    message("Déconnexion effectuée.", "success");
  });

  list?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-news-action]");
    if (!button) return;
    const id = button.dataset.newsId;
    const action = button.dataset.newsAction;
    button.disabled = true;

    if (action === "delete") {
      if (!window.confirm("Supprimer définitivement cette actualité ?")) {
        button.disabled = false;
        return;
      }
      const { error } = await client.from("news_posts").delete().eq("id", id);
      if (error) {
        message(error.message, "error");
        button.disabled = false;
      } else {
        message("Actualité supprimée.", "success");
        await loadPosts();
      }
      return;
    }

    const { error } = await client
      .from("news_posts")
      .update({
        status: action,
        published_at: action === "published" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) {
      message(error.message, "error");
      button.disabled = false;
    } else {
      message(action === "published" ? "Actualité publiée." : "Actualité repassée en brouillon.", "success");
      await loadPosts();
    }
  });

  submissions?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-export-table]");
    if (!button) return;
    downloadCsv(button.dataset.exportTable);
  });

  postForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(postForm);
    const statusValue = formData.get("status");
    const payload = {
      title: formData.get("title"),
      slug: slugify(formData.get("slug") || formData.get("title")),
      excerpt: formData.get("excerpt"),
      content: formData.get("content"),
      category: formData.get("category"),
      status: statusValue,
      published_at: statusValue === "published" ? new Date().toISOString() : null,
    };
    const { error } = await client.from("news_posts").insert(payload);
    if (error) {
      message(error.message, "error");
      return;
    }
    postForm.reset();
    message("Actualité enregistrée.", "success");
    loadPosts();
  });

  document.addEventListener("DOMContentLoaded", refreshSession);
})();
