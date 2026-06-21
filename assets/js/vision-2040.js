(() => {
  const counters = document.querySelectorAll("[data-vision-count]");
  if (!counters.length) return;

  const format = (value) => new Intl.NumberFormat("fr-FR").format(value);

  const animate = (element) => {
    const target = Number(element.dataset.visionCount || 0);
    const suffix = element.dataset.suffix || "";
    const duration = 1300;
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      element.textContent = `${format(value)}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.target.dataset.counted === "true") return;
      entry.target.dataset.counted = "true";
      animate(entry.target);
    });
  }, { threshold: 0.35 });

  counters.forEach((counter) => observer.observe(counter));
})();
