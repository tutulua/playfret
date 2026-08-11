/** Clean, dependency-free SVG fretboard component. */
(function fretboardMasterModule(global) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const VIEWBOX = { width: 1200, height: 330 };
  const NECK = { left: 24, right: 30, bottomLeft: 276, bottomRight: 270 };
  const NUT_X = 62;
  // A 1902-unit scale places the octave at x=1013. Every fret is derived
  // from the equal-temperament rule rather than adjusted by eye.
  const SCALE_LENGTH = 1902;
  const FRET_COUNT = 12;
  const FRET_X = Array.from({ length: FRET_COUNT }, (_, index) =>
    NUT_X + (SCALE_LENGTH * (1 - (2 ** (-(index + 1) / 12))))
  );
  const INLAY_FRETS = [3, 5, 7, 9, 12];
  const STRINGS = [
    { name: "low-e", label: "E", gauge: 5.2, color: "#97958f" },
    { name: "a", label: "A", gauge: 4.3, color: "#aaa8a1" },
    { name: "d", label: "D", gauge: 3.5, color: "#bebbb4" },
    { name: "g", label: "G", gauge: 1.9, color: "#cbc9c3" },
    { name: "b", label: "B", gauge: 1.3, color: "#d9d6cf" },
    { name: "high-e", label: "e", gauge: 0.85, color: "#e5e2da" }
  ];

  function svgElement(tag, attributes = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([name, value]) => {
      node.setAttribute(name, String(value));
    });
    return node;
  }

  function layer(name) {
    return svgElement("g", {
      id: name,
      class: `fretboard-master__${name.toLowerCase()}`,
      "data-component": name
    });
  }

  function neckTopAt(x) {
    return NECK.left + ((NECK.right - NECK.left) * x / VIEWBOX.width);
  }

  function neckBottomAt(x) {
    return NECK.bottomLeft + ((NECK.bottomRight - NECK.bottomLeft) * x / VIEWBOX.width);
  }

  function neckCenterAt(x) {
    return (neckTopAt(x) + neckBottomAt(x)) / 2;
  }

  function createDefinitions() {
    const definitions = svgElement("defs");

    const background = svgElement("linearGradient", { id: "master-background", x1: 0, y1: 0, x2: 0, y2: 1 });
    background.append(
      svgElement("stop", { "stop-color": "#17191b" }),
      svgElement("stop", { offset: 1, "stop-color": "#090a0b" })
    );

    const wood = svgElement("linearGradient", { id: "master-wood", x1: 0, y1: 0, x2: 0, y2: 1 });
    wood.append(
      svgElement("stop", { "stop-color": "#4a2a1d" }),
      svgElement("stop", { offset: 0.5, "stop-color": "#2b1711" }),
      svgElement("stop", { offset: 1, "stop-color": "#3b2017" })
    );

    const metal = svgElement("linearGradient", { id: "master-fret", x1: 0, y1: 0, x2: 1, y2: 0 });
    metal.append(
      svgElement("stop", { "stop-color": "#66645f" }),
      svgElement("stop", { offset: 0.28, "stop-color": "#aaa79f" }),
      svgElement("stop", { offset: 0.56, "stop-color": "#d0cdc4" }),
      svgElement("stop", { offset: 0.78, "stop-color": "#8b8983" }),
      svgElement("stop", { offset: 1, "stop-color": "#5f5e5a" })
    );

    const nut = svgElement("linearGradient", { id: "master-nut", x1: 0, y1: 0, x2: 1, y2: 0 });
    nut.append(
      svgElement("stop", { "stop-color": "#a99d88" }),
      svgElement("stop", { offset: 0.25, "stop-color": "#f3ead8" }),
      svgElement("stop", { offset: 0.7, "stop-color": "#d8cdb8" }),
      svgElement("stop", { offset: 1, "stop-color": "#8f836f" })
    );

    const fretHighlight = svgElement("linearGradient", { id: "master-fret-highlight", x1: 0, y1: 0, x2: 1, y2: 0 });
    fretHighlight.append(
      svgElement("stop", { "stop-color": "#fff", "stop-opacity": 0 }),
      svgElement("stop", { offset: 0.46, "stop-color": "#fff", "stop-opacity": 0.85 }),
      svgElement("stop", { offset: 0.72, "stop-color": "#fff", "stop-opacity": 0.12 }),
      svgElement("stop", { offset: 1, "stop-color": "#fff", "stop-opacity": 0 })
    );

    definitions.append(background, wood, metal, nut, fretHighlight);
    return definitions;
  }

  function createBackground() {
    const group = layer("Background");
    group.append(svgElement("rect", {
      width: VIEWBOX.width,
      height: VIEWBOX.height,
      fill: "url(#master-background)"
    }));
    return group;
  }

  function createNeck() {
    const group = layer("Neck");
    group.append(
      svgElement("path", {
        d: "M0 18 L1192 24 Q1200 24 1200 32 L1200 268 Q1200 276 1192 276 L0 282 Z",
        fill: "#160c09"
      }),
      svgElement("path", {
        d: `M0 ${NECK.left} L1192 ${NECK.right} Q1200 ${NECK.right} 1200 ${NECK.right + 8} L1200 ${NECK.bottomRight - 8} Q1200 ${NECK.bottomRight} 1192 ${NECK.bottomRight} L0 ${NECK.bottomLeft} Z`,
        fill: "url(#master-wood)"
      }),
      createGrain()
    );
    return group;
  }

  function createGrain() {
    const grain = layer("Grain");
    [
      "M18 71 C286 62 510 80 772 68 S1050 72 1182 65",
      "M8 97 C212 105 421 89 631 101 S966 95 1190 104",
      "M24 125 C270 133 510 112 736 124 S1015 119 1176 128",
      "M10 173 C215 160 430 181 650 169 S1010 176 1188 166",
      "M12 215 C228 229 462 206 688 218 S1004 215 1185 226",
      "M20 244 C260 234 498 251 718 240 S1010 246 1182 239"
    ].forEach((d) => grain.append(svgElement("path", { d })));
    return grain;
  }

  function createNut() {
    const group = layer("Nut");
    const top = neckTopAt(NUT_X);
    const bottom = neckBottomAt(NUT_X);
    group.append(
      svgElement("rect", {
        x: NUT_X - 3,
        y: top,
        width: 6,
        height: bottom - top,
        rx: 1.5,
        fill: "url(#master-nut)",
        stroke: "#8f836f",
        "stroke-width": 0.65
      }),
      svgElement("line", {
        x1: NUT_X - 1.4,
        y1: top + 3,
        x2: NUT_X - 1.4,
        y2: bottom - 3,
        stroke: "#fff8e6",
        "stroke-width": 0.65,
        opacity: 0.72
      })
    );
    return group;
  }

  function createFrets() {
    const group = layer("Frets");
    FRET_X.forEach((x, index) => {
      const top = neckTopAt(x);
      const bottom = neckBottomAt(x);
      group.append(svgElement("rect", {
        x: x - 1.65,
        y: top,
        width: 3.3,
        height: bottom - top,
        rx: 1.65,
        fill: "url(#master-fret)",
        "data-fret": index + 1
      }), svgElement("rect", {
        x: x - 0.85,
        y: top + 1,
        width: 1.15,
        height: bottom - top - 2,
        rx: 0.58,
        fill: "url(#master-fret-highlight)",
        "pointer-events": "none"
      }), svgElement("line", {
        x1: x + 1.15,
        y1: top + 2,
        x2: x + 1.15,
        y2: bottom - 2,
        stroke: "#252421",
        "stroke-width": 0.65,
        opacity: 0.7,
        "pointer-events": "none"
      }));
    });
    return group;
  }

  function fretCenter(fretNumber) {
    const left = fretNumber === 1 ? NUT_X : FRET_X[fretNumber - 2];
    return (left + FRET_X[fretNumber - 1]) / 2;
  }

  function createInlays() {
    const group = layer("Inlays");
    INLAY_FRETS.forEach((fretNumber) => {
      const x = fretCenter(fretNumber);
      const center = neckCenterAt(x);
      const stringSpacing = (neckBottomAt(x) - neckTopAt(x)) / (STRINGS.length + 1);
      const positions = fretNumber === 12
        ? [center - (stringSpacing * 0.68), center + (stringSpacing * 0.68)]
        : [center];
      positions.forEach((y) => {
        group.append(svgElement("ellipse", {
          cx: x,
          cy: y,
          rx: 8.25,
          ry: 6,
          fill: "#dedbcf",
          style: "fill: #dedbcf",
          stroke: "#f5f1e5",
          "stroke-width": 1,
          "data-inlay-fret": fretNumber
        }));
      });
    });
    return group;
  }

  function createStrings() {
    const group = layer("Strings");
    const startTop = neckTopAt(0);
    const startBottom = neckBottomAt(0);
    const endTop = neckTopAt(VIEWBOX.width);
    const endBottom = neckBottomAt(VIEWBOX.width);

    STRINGS.forEach((string, index) => {
      const ratio = (index + 1) / (STRINGS.length + 1);
      const stringGroup = svgElement("g", {
        id: `String${index + 1}`,
        class: `fretboard-master__string fretboard-master__string--${index + 1}`,
        "data-component": "String",
        "data-string": string.name,
        "data-string-index": index
      });
      stringGroup.append(svgElement("line", {
        x1: 0,
        y1: startTop + ((startBottom - startTop) * ratio),
        x2: VIEWBOX.width,
        y2: endTop + ((endBottom - endTop) * ratio),
        stroke: string.color,
        style: `stroke: ${string.color}`,
        "stroke-width": string.gauge,
        "stroke-linecap": "round",
        "aria-label": `Cuerda ${string.label}`
      }));
      group.append(stringGroup);
    });
    return group;
  }

  function createFretNumbers() {
    const group = layer("Fret-numbers");
    FRET_X.forEach((x, index) => {
      const label = svgElement("text", { x: fretCenter(index + 1), y: 319 });
      label.textContent = String(index + 1);
      group.append(label);
    });
    return group;
  }

  function createFretboardMaster() {
    const svg = svgElement("svg", {
      class: "fretboard-master",
      viewBox: `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`,
      preserveAspectRatio: "none",
      role: "img",
      "aria-labelledby": "fretboard-master-title fretboard-master-description"
    });
    const title = svgElement("title", { id: "fretboard-master-title" });
    title.textContent = "Mástil de guitarra de seis cuerdas";
    const description = svgElement("desc", { id: "fretboard-master-description" });
    description.textContent = "Diapasón oscuro con doce trastes, marcadores ovalados y seis cuerdas independientes.";

    svg.append(
      title,
      description,
      createDefinitions(),
      createBackground(),
      createNeck(),
      createNut(),
      createFrets(),
      createInlays(),
      createStrings(),
      createFretNumbers()
    );
    return svg;
  }

  function mount(container) {
    container.replaceChildren(createFretboardMaster());
    container.dataset.strings = String(STRINGS.length);
    return STRINGS.length;
  }

  global.PlayFret = global.PlayFret || {};
  global.PlayFret.FretboardMaster = { create: createFretboardMaster, mount };
}(window));
