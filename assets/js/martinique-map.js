(function () {
  const MAP_SELECTOR = "[data-martinique-map]";
  const GEOJSON_URL = "assets/data/martinique-communes.geojson";
  const SVG_WIDTH = 620;
  const SVG_HEIGHT = 820;
  const PADDING = 26;

  const zonesByCode = {
    "97234": "Nord Caraibe",
    "97205": "Nord Caraibe",
    "97204": "Nord Caraibe",
    "97208": "Nord Caraibe",
    "97233": "Nord Caraibe",
    "97219": "Nord Caraibe",
    "97225": "Nord Caraibe",
    "97201": "Nord Atlantique",
    "97203": "Nord Atlantique",
    "97211": "Nord Atlantique",
    "97212": "Nord Atlantique",
    "97214": "Nord Atlantique",
    "97215": "Nord Atlantique",
    "97216": "Nord Atlantique",
    "97218": "Nord Atlantique",
    "97228": "Nord Atlantique",
    "97230": "Nord Atlantique",
    "97222": "Nord Atlantique",
    "97209": "Centre",
    "97213": "Centre",
    "97224": "Centre",
    "97229": "Centre",
    "97202": "Sud Caraibe",
    "97206": "Sud Caraibe",
    "97207": "Sud Caraibe",
    "97221": "Sud Caraibe",
    "97227": "Sud Caraibe",
    "97231": "Sud Caraibe",
    "97210": "Sud Atlantique",
    "97217": "Sud Atlantique",
    "97220": "Sud Atlantique",
    "97223": "Sud Atlantique",
    "97226": "Sud Atlantique",
    "97232": "Sud Atlantique",
    "97233": "Nord Caraibe"
  };

  const prioritiesByZone = {
    "Nord Caraibe": "patrimoine, littoral, services de proximite",
    "Nord Atlantique": "agriculture, eau, risques climatiques",
    Centre: "logement, securite, economie, mobilite",
    "Sud Caraibe": "tourisme, jeunesse, habitat",
    "Sud Atlantique": "peche, agriculture, cohesion territoriale"
  };

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function collectPositions(geometry) {
    const positions = [];

    function walk(value) {
      if (!Array.isArray(value)) return;
      if (typeof value[0] === "number" && typeof value[1] === "number") {
        positions.push(value);
        return;
      }
      value.forEach(walk);
    }

    walk(geometry.coordinates);
    return positions;
  }

  function getBounds(features) {
    const bounds = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    };

    features.forEach((feature) => {
      collectPositions(feature.geometry).forEach(([x, y]) => {
        bounds.minX = Math.min(bounds.minX, x);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxY = Math.max(bounds.maxY, y);
      });
    });

    return bounds;
  }

  function createProjector(bounds) {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const scale = Math.min((SVG_WIDTH - PADDING * 2) / width, (SVG_HEIGHT - PADDING * 2) / height);
    const offsetX = (SVG_WIDTH - width * scale) / 2;
    const offsetY = (SVG_HEIGHT - height * scale) / 2;

    return function project(position) {
      const [lon, lat] = position;
      return [
        offsetX + (lon - bounds.minX) * scale,
        offsetY + (bounds.maxY - lat) * scale
      ];
    };
  }

  function ringToPath(ring, project) {
    return ring
      .map((position, index) => {
        const [x, y] = project(position);
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + " Z";
  }

  function geometryToPath(geometry, project) {
    if (geometry.type === "Polygon") {
      return geometry.coordinates.map((ring) => ringToPath(ring, project)).join(" ");
    }

    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates
        .map((polygon) => polygon.map((ring) => ringToPath(ring, project)).join(" "))
        .join(" ");
    }

    return "";
  }

  function clearSelected(paths) {
    paths.forEach((path) => path.classList.remove("is-selected"));
  }

  function updatePanel(panel, feature) {
    if (!panel || !feature) return;

    const name = feature.properties.nom;
    const code = feature.properties.code;
    const zone = zonesByCode[code] || "Zone a confirmer";
    const priority = prioritiesByZone[zone] || "diagnostic territorial";
    const link = `portraits-communes.html#commune-${code}`;

    panel.innerHTML = `
      <p class="section-label">Commune selectionnee</p>
      <h3>${name}</h3>
      <dl>
        <div><dt>Code INSEE</dt><dd>${code}</dd></div>
        <div><dt>Bassin de vie</dt><dd>${zone}</dd></div>
        <div><dt>Priorites</dt><dd>${priority}</dd></div>
      </dl>
      <a class="btn btn-gold" href="${link}">Ouvrir la fiche communale</a>
    `;
  }

  function renderCommuneList(list, features, selectFeature) {
    if (!list) return;

    list.innerHTML = "";
    features
      .slice()
      .sort((a, b) => a.properties.nom.localeCompare(b.properties.nom, "fr"))
      .forEach((feature) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = feature.properties.nom;
        button.dataset.communeCode = feature.properties.code;
        button.addEventListener("click", () => selectFeature(feature, true));
        list.appendChild(button);
      });
  }

  function initMap(container) {
    const svgHost = container.querySelector("[data-map-svg]");
    const panel = container.querySelector("[data-map-panel]");
    const list = container.querySelector("[data-map-list]");
    const status = container.querySelector("[data-map-status]");

    if (!svgHost) return;

    fetch(GEOJSON_URL)
      .then((response) => {
        if (!response.ok) throw new Error("GeoJSON unavailable");
        return response.json();
      })
      .then((geojson) => {
        const features = geojson.features || [];
        const bounds = getBounds(features);
        const project = createProjector(bounds);
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const paths = [];

        svg.setAttribute("viewBox", `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`);
        svg.setAttribute("role", "group");
        svg.setAttribute("aria-label", "Carte interactive des 34 communes de Martinique");
        svg.classList.add("martinique-svg-map");

        const shadow = document.createElementNS("http://www.w3.org/2000/svg", "g");
        shadow.setAttribute("class", "map-shadow-layer");
        svg.appendChild(shadow);

        const layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        layer.setAttribute("class", "map-commune-layer");
        svg.appendChild(layer);

        function selectFeature(feature, followLink) {
          const code = feature.properties.code;
          const path = paths.find((item) => item.dataset.code === code);
          clearSelected(paths);
          if (path) path.classList.add("is-selected");
          updatePanel(panel, feature);
          if (followLink) {
            window.location.href = `portraits-communes.html#commune-${code}`;
          }
        }

        features.forEach((feature) => {
          const code = feature.properties.code;
          const name = feature.properties.nom;
          const zone = zonesByCode[code] || "";
          const pathData = geometryToPath(feature.geometry, project);
          if (!pathData) return;

          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", pathData);
          path.setAttribute("tabindex", "0");
          path.setAttribute("role", "link");
          path.setAttribute("aria-label", `${name}, ${zone}. Ouvrir la fiche communale.`);
          path.dataset.code = code;
          path.dataset.name = name;
          path.dataset.zone = normalize(zone).replace(/\s+/g, "-");
          path.classList.add("map-commune-shape");

          const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
          title.textContent = `${name} - ${zone}`;
          path.appendChild(title);

          path.addEventListener("mouseenter", () => selectFeature(feature, false));
          path.addEventListener("focus", () => selectFeature(feature, false));
          path.addEventListener("click", () => selectFeature(feature, true));
          path.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              selectFeature(feature, true);
            }
          });

          layer.appendChild(path);
          paths.push(path);
        });

        svgHost.innerHTML = "";
        svgHost.appendChild(svg);
        renderCommuneList(list, features, selectFeature);
        updatePanel(panel, features.find((feature) => feature.properties.code === "97209") || features[0]);

        if (status) {
          status.textContent = "Carte chargee : cliquez sur une commune pour ouvrir sa fiche.";
        }
      })
      .catch(() => {
        svgHost.innerHTML = '<p class="map-error">La carte interactive ne peut pas etre chargee pour le moment.</p>';
        if (status) {
          status.textContent = "Carte indisponible. Utilisez la liste des communes ci-dessous.";
        }
      });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(MAP_SELECTOR).forEach(initMap);
  });
})();
