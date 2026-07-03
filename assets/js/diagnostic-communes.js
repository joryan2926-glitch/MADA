(function () {
  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function initCommuneFilters() {
    const searchInput = document.querySelector("[data-commune-search]");
    const filterButtons = Array.from(document.querySelectorAll("[data-zone-filter]"));
    const cards = Array.from(document.querySelectorAll(".commune-diagnostic-grid article"));
    const resultCount = document.querySelector("[data-commune-count]");
    const emptyState = document.querySelector("[data-commune-empty]");

    if (!searchInput || !cards.length) return;

    let activeZone = "all";

    function update() {
      const query = normalize(searchInput.value);
      let visibleCount = 0;

      cards.forEach((card) => {
        const zone = card.dataset.zone || "";
        const text = normalize(card.textContent);
        const matchesZone = activeZone === "all" || zone === activeZone;
        const matchesQuery = !query || text.includes(query);
        const isVisible = matchesZone && matchesQuery;

        card.hidden = !isVisible;
        if (isVisible) visibleCount += 1;
      });

      if (resultCount) {
        resultCount.textContent = `${visibleCount} commune${visibleCount > 1 ? "s" : ""} affichée${visibleCount > 1 ? "s" : ""}`;
      }

      if (emptyState) {
        emptyState.hidden = visibleCount !== 0;
      }
    }

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeZone = button.dataset.zoneFilter || "all";
        filterButtons.forEach((item) => {
          item.classList.toggle("is-active", item === button);
          item.setAttribute("aria-pressed", item === button ? "true" : "false");
        });
        update();
      });
    });

    searchInput.addEventListener("input", update);
    update();
  }

  document.addEventListener("DOMContentLoaded", initCommuneFilters);
})();
