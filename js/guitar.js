/** Composable, dependency-free SVG fretboard. */
(function guitarModule(global) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const STRING_DATA = [
    { name: "E", gauge: 5.2 },
    { name: "A", gauge: 4.4 },
    { name: "D", gauge: 3.6 },
    { name: "G", gauge: 2.8 },
    { name: "B", gauge: 2.1 },
    { name: "e", gauge: 1.5 }
  ];
  const FRET_POSITIONS = [42, 190, 330, 462, 587, 705, 816, 922, 1022];

  function svgElement(tag, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    return element;
  }

  function createDefinitions() {
    const defs = svgElement("defs");
    defs.innerHTML = `
      <linearGradient id="fretboard-wood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3b2016"/><stop offset=".18" stop-color="#28150f"/>
        <stop offset=".52" stop-color="#4a281b"/><stop offset=".82" stop-color="#24130e"/><stop offset="1" stop-color="#3a1d14"/>
      </linearGradient>
      <linearGradient id="fretboard-edge" x1="0" x2="0" y2="1">
        <stop stop-color="#8b5b3b"/><stop offset=".35" stop-color="#2c160f"/><stop offset="1" stop-color="#140a07"/>
      </linearGradient>
      <linearGradient id="fret-metal" x1="0" x2="1">
        <stop stop-color="#4a4a48"/><stop offset=".28" stop-color="#bcbab4"/><stop offset=".52" stop-color="#f2eee4"/><stop offset=".72" stop-color="#92918d"/><stop offset="1" stop-color="#3b3c3d"/>
      </linearGradient>
      <linearGradient id="string-metal" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#706f6b"/><stop offset=".34" stop-color="#f4f1e7"/><stop offset=".52" stop-color="#a9aaa7"/><stop offset="1" stop-color="#444545"/>
      </linearGradient>
      <radialGradient id="inlay-pearl" cx="35%" cy="28%">
        <stop stop-color="#fffdf2"/><stop offset=".45" stop-color="#d8d4c6"/><stop offset="1" stop-color="#8b897f"/>
      </radialGradient>
      <filter id="fret-shadow" x="-50%" width="200%"><feDropShadow dx="2.5" dy="0" stdDeviation="1.5" flood-color="#050302" flood-opacity=".8"/></filter>
      <filter id="string-shadow" x="0" y="-100%" width="100%" height="300%"><feDropShadow dx="0" dy="2.5" stdDeviation="1.2" flood-color="#000" flood-opacity=".85"/></filter>`;
    return defs;
  }

  function createWood() {
    const group = svgElement("g", { class: "fretboard__wood", "data-layer": "wood" });
    group.innerHTML = `
      <rect class="fretboard__edge" x="0" y="14" width="1080" height="252" rx="12" fill="url(#fretboard-edge)"/>
      <rect x="0" y="20" width="1080" height="238" rx="8" fill="url(#fretboard-wood)"/>
      <g class="fretboard__grain">
        <path d="M0 52C135 24 225 75 364 45s239-3 360 8 236-28 356-8"/>
        <path d="M0 101c184 31 302-29 474-5s310 16 606-11"/>
        <path d="M0 154c128-20 272 20 410-5s292 14 430-5 168-4 240 3"/>
        <path d="M0 213c166 28 290-20 441 2s266-15 401 2 171 8 238-5"/>
        <path d="M54 20c83 82 25 146 105 238M522 20c-61 80 46 151-24 238M932 20c53 69-35 155 28 238"/>
      </g>`;
    return group;
  }

  function createFrets() {
    const group = svgElement("g", { class: "fretboard__frets", "data-layer": "frets" });
    FRET_POSITIONS.forEach((x, index) => {
      group.append(svgElement("rect", { x, y: 19, width: index === 0 ? 9 : 5, height: 240, rx: 2, fill: "url(#fret-metal)", "data-fret": index }));
    });
    return group;
  }

  function createMarkers() {
    const group = svgElement("g", { class: "fretboard__markers", "data-layer": "markers" });
    [396, 646, 869].forEach((cx) => group.append(svgElement("circle", { cx, cy: 139, r: 8 })));
    [972, 972].forEach((cx, index) => group.append(svgElement("circle", { cx, cy: index ? 173 : 105, r: 7.5 })));
    return group;
  }

  function createStrings() {
    const group = svgElement("g", { class: "fretboard__strings", "data-layer": "strings" });
    STRING_DATA.forEach((string, index) => {
      const y = 48 + index * 36.4;
      group.append(svgElement("line", { x1: 0, y1: y, x2: 1080, y2: y, "stroke-width": string.gauge, "data-string": string.name, "data-string-index": index }));
    });
    return group;
  }

  function createFretboard() {
    const svg = svgElement("svg", { class: "fretboard", viewBox: "0 0 1080 280", preserveAspectRatio: "xMidYMid meet", role: "img", "aria-labelledby": "fretboard-title fretboard-description" });
    const title = svgElement("title", { id: "fretboard-title" });
    title.textContent = "Mástil de guitarra de seis cuerdas";
    const description = svgElement("desc", { id: "fretboard-description" });
    description.textContent = "Diapasón de madera oscura con trastes, marcadores de nácar y seis cuerdas de distinto calibre.";
    svg.append(title, description, createDefinitions(), createWood(), createMarkers(), createFrets(), createStrings());
    return svg;
  }

  function createFretLabels() {
    const labels = document.createElement("div");
    labels.className = "fretboard__labels";
    labels.setAttribute("aria-hidden", "true");
    labels.innerHTML = "<span>1</span><span>3</span><span>5</span><span>7</span><span>9</span><span>12</span>";
    return labels;
  }

  function createStringLabels() {
    const labels = document.createElement("div");
    labels.className = "fretboard__tunings";
    labels.setAttribute("aria-hidden", "true");
    STRING_DATA.forEach(({ name }) => {
      const label = document.createElement("span");
      label.textContent = name;
      labels.append(label);
    });
    return labels;
  }

  function mountFretboard(container) {
    container.replaceChildren(createFretLabels(), createFretboard(), createStringLabels());
    return describeFretboard(container);
  }

  function describeFretboard(element) {
    const strings = element.querySelectorAll("[data-string]").length;
    element.dataset.strings = String(strings);
    return strings;
  }

  global.PlayFret = global.PlayFret || {};
  global.PlayFret.Guitar = { createFretboard, mountFretboard, describeFretboard };
}(window));
