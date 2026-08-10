/** Clean, dependency-free SVG fretboard component. */
(function fretboardMasterModule(global) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const VIEWBOX = { width: 1200, height: 300 };
  const NECK = { left: 24, right: 46, bottomLeft: 276, bottomRight: 254 };
  const NUT_X = 62;
  const FRET_X = [166, 265, 359, 448, 533, 613, 689, 761, 829, 894, 955, 1013];
  const INLAY_FRETS = [3, 5, 7, 9, 12];
  const STRINGS = [
    { name: "low-e", label: "E", gauge: 4.6, color: "#a9a49a" },
    { name: "a", label: "A", gauge: 3.9, color: "#bbb6aa" },
    { name: "d", label: "D", gauge: 3.2, color: "#cbc6b9" },
    { name: "g", label: "G", gauge: 2.5, color: "#d7d3c8" },
    { name: "b", label: "B", gauge: 1.8, color: "#e1ded5" },
    { name: "high-e", label: "e", gauge: 1.2, color: "#ece9df" }
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
      svgElement("stop", { "stop-color": "#706f6a" }),
      svgElement("stop", { offset: 0.45, "stop-color": "#f2efe5" }),
      svgElement("stop", { offset: 1, "stop-color": "#777671" })
    );

    definitions.append(background, wood, metal);
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
        d: "M0 18 L1200 40 L1200 260 L0 282 Z",
        fill: "#160c09"
      }),
      svgElement("path", {
        d: `M0 ${NECK.left} L1200 ${NECK.right} L1200 ${NECK.bottomRight} L0 ${NECK.bottomLeft} Z`,
        fill: "url(#master-wood)"
      })
    );
    return group;
  }

  function createNut() {
    const group = layer("Nut");
    const top = neckTopAt(NUT_X);
    const bottom = neckBottomAt(NUT_X);
    group.append(svgElement("rect", {
      x: NUT_X - 5,
      y: top,
      width: 10,
      height: bottom - top,
      rx: 2,
      fill: "#e8dfc9"
    }));
    return group;
  }

  function createFrets() {
    const group = layer("Frets");
    FRET_X.forEach((x, index) => {
      const top = neckTopAt(x);
      const bottom = neckBottomAt(x);
      group.append(svgElement("rect", {
        x: x - 3,
        y: top,
        width: 6,
        height: bottom - top,
        rx: 2,
        fill: "url(#master-fret)",
        "data-fret": index + 1
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
      const positions = fretNumber === 12 ? [126, 174] : [150];
      positions.forEach((y) => {
        group.append(svgElement("ellipse", {
          cx: x,
          cy: y,
          rx: 11,
          ry: 8,
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
      createStrings()
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
