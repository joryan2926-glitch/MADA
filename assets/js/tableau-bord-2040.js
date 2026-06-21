(() => {
  const format = (value) => new Intl.NumberFormat("fr-FR").format(value);

  const animateCounter = (element) => {
    const target = Number(element.dataset.dashboardCount || 0);
    const suffix = element.dataset.suffix || "";
    const duration = 1400;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = `${format(Math.round(target * eased))}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.target.dataset.counted === "true") return;
      entry.target.dataset.counted = "true";
      animateCounter(entry.target);
    });
  }, { threshold: 0.35 });

  document.querySelectorAll("[data-dashboard-count]").forEach((counter) => {
    counterObserver.observe(counter);
  });

  const progressObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
    });
  }, { threshold: 0.24 });

  document.querySelectorAll(".dashboard-axis-row").forEach((row) => {
    progressObserver.observe(row);
  });

  const communeData = {
    nord: {
      title: "Nord Caraïbe",
      text: "Priorités suivies : santé de proximité, mobilité, revitalisation des bourgs, agriculture et protection du littoral.",
      stats: ["8 communes suivies", "14 projets recensés", "32% diagnostic consolidé"]
    },
    centre: {
      title: "Centre",
      text: "Priorités suivies : logement, sécurité, mobilité quotidienne, services publics et développement économique.",
      stats: ["4 communes suivies", "18 projets recensés", "41% diagnostic consolidé"]
    },
    atlantique: {
      title: "Atlantique",
      text: "Priorités suivies : agriculture, eau, pêche, économie bleue, centres-bourgs et adaptation climatique.",
      stats: ["10 communes suivies", "21 projets recensés", "29% diagnostic consolidé"]
    },
    sud: {
      title: "Sud",
      text: "Priorités suivies : tourisme durable, culture, habitat, littoral, jeunesse et services de proximité.",
      stats: ["12 communes suivies", "24 projets recensés", "36% diagnostic consolidé"]
    }
  };

  const panel = document.querySelector("[data-commune-panel]");
  const dots = document.querySelectorAll("[data-commune]");

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const data = communeData[dot.dataset.commune];
      if (!data || !panel) return;

      dots.forEach((item) => item.classList.remove("active"));
      dot.classList.add("active");
      panel.querySelector("h3").textContent = data.title;
      panel.querySelector("p").textContent = data.text;
      panel.querySelectorAll(".commune-status-grid div").forEach((item, index) => {
        const [value, ...label] = data.stats[index].split(" ");
        item.querySelector("strong").textContent = value;
        item.querySelector("small").textContent = label.join(" ");
      });
    });
  });
})();
