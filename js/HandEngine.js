/** Layered, transparent SVG guide hand for the existing PlayFret fretboard. */
(function handEngineModule(global) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  function node(name, attributes = {}) {
    const element = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  }

  function number(nodeValue, attribute) {
    const value = Number(nodeValue?.getAttribute(attribute));
    if (!Number.isFinite(value)) throw new Error(`La geometría SVG no contiene ${attribute}.`);
    return value;
  }

  function addFinger(group, name, path, creases) {
    const finger = node("g", {
      class: `hand-engine__finger hand-engine__finger--${name}`,
      "data-hand-part": name
    });
    finger.append(node("path", { class: "hand-engine__skin", d: path }));
    creases.forEach((d) => finger.append(node("path", { class: "hand-engine__crease", d })));
    group.append(finger);
    return finger;
  }

  class HandEngine {
    constructor(svg) {
      if (!svg) throw new TypeError("HandEngine requiere el SVG del mástil.");
      this.svg = svg;
      this.visible = true;
      this.geometry = this.readGeometry();
      this.parts = this.drawHand();
      this.lastPose = null;
    }

    readGeometry() {
      const strings = [...this.svg.querySelectorAll("[data-string-index] line")];
      const frets = [...this.svg.querySelectorAll("[data-fret]")];
      const nut = this.svg.querySelector(".fretboard-master__nut rect");
      if (strings.length !== 6 || !frets.length || !nut) throw new Error("El mástil no expone su geometría completa.");
      const stringY = strings.map((string) => number(string, "y1"));
      return {
        stringY,
        fretX: frets.map((fret) => number(fret, "x") + (number(fret, "width") / 2)),
        nutX: number(nut, "x") + (number(nut, "width") / 2),
        spacing: Math.abs(stringY[1] - stringY[0])
      };
    }

    createDefinitions() {
      const definitions = this.svg.querySelector("defs");
      const skin = node("linearGradient", { id: "hand-skin", x1: 0, y1: 0, x2: 1, y2: 0 });
      skin.append(
        node("stop", { "stop-color": "#9b5539" }),
        node("stop", { offset: .42, "stop-color": "#d8946d" }),
        node("stop", { offset: .72, "stop-color": "#efb18a" }),
        node("stop", { offset: 1, "stop-color": "#a65c40" })
      );
      definitions.append(skin);
    }

    drawHand() {
      this.createDefinitions();
      const back = node("g", { class: "hand-engine hand-engine--back", "aria-hidden": "true" });
      const front = node("g", { class: "hand-engine hand-engine--front", "aria-hidden": "true" });

      const palm = node("g", { class: "hand-engine__palm", "data-hand-part": "palm" });
      palm.append(node("path", {
        class: "hand-engine__skin",
        d: "M-132 326 C-132 274 -112 226 -77 201 C-49 181 35 178 72 199 C105 218 126 269 124 326 Z"
      }));
      back.append(palm);

      const thumb = node("g", { class: "hand-engine__thumb", "data-hand-part": "thumb" });
      thumb.append(
        node("path", {
          class: "hand-engine__skin",
          d: "M-108 -9 C-87 -15 -66 -4 -56 17 C-49 31 -39 43 -22 51 C-10 57 -6 71 -13 82 C-21 94 -38 95 -50 87 C-73 72 -89 52 -101 31 C-110 16 -119 1 -108 -9 Z"
        }),
        node("path", { class: "hand-engine__nail", d: "M-41 54 C-29 53 -20 60 -19 69 C-20 77 -27 82 -36 80 C-45 77 -49 62 -41 54 Z" }),
        node("path", { class: "hand-engine__crease", d: "M-76 31 C-67 27 -59 27 -51 31" })
      );
      front.append(thumb);

      const fingers = {
        index: addFinger(front, "index", "M-117 319 C-121 280 -118 245 -111 215 C-105 189 -107 159 -102 134 C-99 116 -87 105 -73 108 C-57 111 -51 126 -55 143 C-61 169 -70 191 -69 219 C-68 251 -71 286 -76 319 Z", ["M-104 214 C-94 218 -83 218 -71 214", "M-101 238 C-91 242 -81 242 -71 239"]),
        middle: addFinger(front, "middle", "M-71 322 C-76 281 -71 246 -65 211 C-61 185 -62 151 -58 120 C-55 99 -43 87 -27 89 C-10 91 -3 106 -6 126 C-10 156 -19 183 -17 212 C-15 249 -20 284 -23 322 Z", ["M-59 206 C-48 210 -34 210 -20 206", "M-57 232 C-45 236 -32 236 -19 231"]),
        ring: addFinger(front, "ring", "M-22 323 C-25 285 -19 251 -14 220 C-10 194 -10 163 -5 137 C-2 118 10 107 25 109 C41 111 48 126 44 145 C39 170 31 193 33 221 C35 255 31 289 28 323 Z", ["M-9 214 C3 218 18 218 31 214", "M-7 240 C5 244 19 244 32 239"]),
        little: addFinger(front, "little", "M28 325 C25 292 31 263 37 237 C42 214 42 189 47 168 C51 151 63 141 77 144 C91 147 98 160 94 177 C89 199 82 216 84 241 C87 269 82 297 79 325 Z", ["M41 232 C53 236 69 237 82 232", "M42 255 C54 260 70 260 84 255"])
      };

      const neck = this.svg.querySelector(".fretboard-master__neck");
      this.svg.insertBefore(back, neck);
      this.svg.append(front);
      return { back, front, palm, thumb, ...fingers };
    }

    setVisible(visible) {
      this.visible = Boolean(visible);
      this.applyVisibility();
    }

    applyVisibility() {
      const opacity = this.visible ? "1" : "0";
      this.parts.back.setAttribute("opacity", opacity);
      this.parts.front.setAttribute("opacity", opacity);
    }

    positionFor(note) { return note.fret > 0 ? Math.max(1, Math.min(note.fret, 9)) : 1; }
    fingerFor(note, position) { return note.fret === 0 ? -1 : Math.max(0, Math.min(3, note.fret - position)); }

    fretCenter(fret) {
      const bounded = Math.max(1, Math.min(fret, this.geometry.fretX.length));
      const left = bounded === 1 ? this.geometry.nutX : this.geometry.fretX[bounded - 2];
      return (left + this.geometry.fretX[bounded - 1]) / 2;
    }

    staticAnchor(sequence) {
      const fretted = sequence.find((note) => note.fret > 0);
      const position = fretted ? this.positionFor(fretted) : 1;
      return { x: this.fretCenter(position + 1), position };
    }

    layout(sequence) {
      const anchor = this.staticAnchor(sequence);
      return sequence.map((note) => ({ ...note, handPosition: anchor.position, finger: this.fingerFor(note, anchor.position), anchorX: anchor.x }));
    }

    playbackDuration(sequence) {
      const last = sequence[sequence.length - 1];
      return last.time + last.duration;
    }

    lessonTime(elapsed) { return elapsed; }

    poseAt(sequence) {
      const anchor = this.staticAnchor(sequence);
      return { ...anchor, opacity: 1, note: null, pressure: 0 };
    }

    render(pose) {
      this.lastPose = pose;
      const scale = this.geometry.spacing / 35;
      const transform = `translate(${pose.x} 0) scale(${scale})`;
      this.parts.back.setAttribute("transform", transform);
      this.parts.front.setAttribute("transform", transform);
      this.applyVisibility();
    }

    resetOffscreen() {
      const pose = this.lastPose || { x: this.fretCenter(2), position: 1 };
      this.render({ ...pose, opacity: 1, note: null, pressure: 0 });
    }
  }

  global.PlayFret = global.PlayFret || {};
  global.PlayFret.HandEngine = HandEngine;
  if (typeof module !== "undefined" && module.exports) module.exports = HandEngine;
}(typeof globalThis !== "undefined" ? globalThis : window));
