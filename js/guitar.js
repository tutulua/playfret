/** Fretboard MASTER v1.0 — composable, dependency-free SVG component. */
(function fretboardMasterModule(global) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const WIDTH = 1200;
  const STRING_DATA = [
    { name: "E", gauge: 6.4, y1: 67, y2: 78 },
    { name: "A", gauge: 5.3, y1: 101, y2: 107 },
    { name: "D", gauge: 4.2, y1: 135, y2: 136 },
    { name: "G", gauge: 3.2, y1: 169, y2: 165 },
    { name: "B", gauge: 2.4, y1: 203, y2: 194 },
    { name: "e", gauge: 1.6, y1: 237, y2: 223 }
  ];
  const FRET_POSITIONS = [46, 211, 367, 514, 653, 784, 908, 1025, 1135];

  function element(tag, attributes = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    return node;
  }

  function Definitions() {
    const defs = element("defs");
    defs.innerHTML = `
      <linearGradient id="master-background" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#17191a"/><stop offset=".5" stop-color="#090a0b"/><stop offset="1" stop-color="#151718"/>
      </linearGradient>
      <linearGradient id="master-wood" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#4a291b"/><stop offset=".13" stop-color="#2b1710"/><stop offset=".48" stop-color="#402318"/><stop offset=".83" stop-color="#24120d"/><stop offset="1" stop-color="#4a281a"/>
      </linearGradient>
      <linearGradient id="master-edge" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#a06b45"/><stop offset=".22" stop-color="#3a1e14"/><stop offset=".8" stop-color="#190c09"/><stop offset="1" stop-color="#090504"/>
      </linearGradient>
      <linearGradient id="master-fret" x1="0" x2="1">
        <stop stop-color="#555552"/><stop offset=".27" stop-color="#dedbd1"/><stop offset=".5" stop-color="#fffdf5"/><stop offset=".7" stop-color="#9c9b96"/><stop offset="1" stop-color="#393a3a"/>
      </linearGradient>
      <linearGradient id="master-string" x1="0" y1="0" x2="0" y2="1">
        <stop stop-color="#555653"/><stop offset=".3" stop-color="#fcfaf0"/><stop offset=".52" stop-color="#aaa9a3"/><stop offset="1" stop-color="#3e3f3e"/>
      </linearGradient>
      <radialGradient id="master-inlay" cx="32%" cy="26%">
        <stop stop-color="#fffef4"/><stop offset=".42" stop-color="#d8d5c8"/><stop offset="1" stop-color="#89877e"/>
      </radialGradient>
      <filter id="master-neck-shadow" x="-10%" y="-30%" width="120%" height="170%"><feDropShadow dx="0" dy="15" stdDeviation="12" flood-color="#000" flood-opacity=".8"/></filter>
      <filter id="master-fret-shadow" x="-100%" width="300%"><feDropShadow dx="3" dy="0" stdDeviation="1.5" flood-color="#000" flood-opacity=".9"/></filter>
      <filter id="master-string-shadow" x="0" y="-200%" width="100%" height="500%"><feDropShadow dx="0" dy="3" stdDeviation="1.3" flood-color="#000" flood-opacity=".95"/></filter>
      <clipPath id="master-neck-clip"><path d="M0 29L1200 46V254L0 271Z"/></clipPath>`;
    return defs;
  }

  /* Each named function owns one visual layer, ready for future controllers. */
  function Background() {
    const group = element("g", { id: "Background", class: "fretboard-master__background", "data-component": "Background" });
    group.append(element("rect", { width: WIDTH, height: 300, fill: "url(#master-background)" }));
    return group;
  }

  function Neck() {
    const group = element("g", { id: "Neck", class: "fretboard-master__neck", "data-component": "Neck", filter: "url(#master-neck-shadow)" });
    group.innerHTML = `
      <path class="fretboard-master__edge" d="M0 23L1200 41V261L0 277Z" fill="url(#master-edge)"/>
      <path d="M0 29L1200 46V254L0 271Z" fill="url(#master-wood)"/>
      <g class="fretboard-master__grain" clip-path="url(#master-neck-clip)">
        <path d="M-20 60C128 31 253 88 407 55s257 2 389 11 269-28 425-5"/>
        <path d="M-20 112c191 30 319-26 501-4s342 14 740-12"/>
        <path d="M-20 171c159-25 298 19 457-7s307 14 467-5 231-3 317 2"/>
        <path d="M-20 230c195 30 327-21 500 1s286-15 446 2 213 8 295-7"/>
        <path d="M128 18c68 77 20 174 91 264M584 25c-60 75 42 168-30 250M1042 35c52 68-29 157 30 230"/>
      </g>`;
    return group;
  }

  function Frets() {
    const group = element("g", { id: "Frets", class: "fretboard-master__frets", "data-component": "Frets", filter: "url(#master-fret-shadow)" });
    FRET_POSITIONS.forEach((x, index) => {
      const inset = 29 + (17 * x / WIDTH);
      group.append(element("line", { x1: x, y1: inset, x2: x, y2: 300 - inset, "stroke-width": index === 0 ? 11 : 6, "data-fret": index }));
    });
    return group;
  }

  function Inlays() {
    const group = element("g", { id: "Inlays", class: "fretboard-master__inlays", "data-component": "Inlays" });
    [[440, 150], [719, 150], [968, 150], [1081, 121], [1081, 179]].forEach(([cx, cy]) => {
      group.append(element("ellipse", { cx, cy, rx: 10, ry: 7 }));
    });
    return group;
  }

  function StringLayer(string, index) {
    const number = index + 1;
    const group = element("g", { id: `String${number}`, class: `fretboard-master__string fretboard-master__string--${number}`, "data-component": `String${number}`, "data-string": string.name, "data-string-index": index });
    group.append(element("line", { x1: 0, y1: string.y1, x2: WIDTH, y2: string.y2, "stroke-width": string.gauge }));
    return group;
  }

  function createFretboardMaster() {
    const svg = element("svg", { class: "fretboard-master", viewBox: "0 0 1200 300", preserveAspectRatio: "xMidYMid meet", role: "img", "aria-labelledby": "fretboard-master-title fretboard-master-description" });
    const title = element("title", { id: "fretboard-master-title" });
    title.textContent = "Mástil de guitarra de seis cuerdas";
    const description = element("desc", { id: "fretboard-master-description" });
    description.textContent = "Diapasón de madera oscura en perspectiva, con trastes metálicos, marcadores ovalados y seis cuerdas de distinto calibre.";
    svg.append(title, description, Definitions(), Background(), Neck(), Inlays(), Frets());
    STRING_DATA.forEach((string, index) => svg.append(StringLayer(string, index)));
    return svg;
  }

  function mount(container) {
    container.replaceChildren(createFretboardMaster());
    container.dataset.strings = String(STRING_DATA.length);
    return STRING_DATA.length;
  }

  global.PlayFret = global.PlayFret || {};
  global.PlayFret.FretboardMaster = { create: createFretboardMaster, mount };
  // Keep the bootstrap contract stable while fully replacing the old component.
  global.PlayFret.Guitar = { createFretboard: createFretboardMaster, mountFretboard: mount };
}(window));
