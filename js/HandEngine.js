/** Anatomical left-hand guide for the PlayFret SVG fretboard. */
(function handEngineModule(global) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const ENTRY_MS = 850;
  const RELEASE_MS = 150;
  const FINGERS = ["index", "middle", "ring", "little"];

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

  function clamp(value) { return Math.max(0, Math.min(1, value)); }
  function smooth(value) {
    const progress = clamp(value);
    return progress * progress * (3 - (2 * progress));
  }
  function mix(from, to, progress) { return from + ((to - from) * smooth(progress)); }

  class HandEngine {
    constructor(svg) {
      if (!svg) throw new TypeError("HandEngine requiere el SVG del mástil.");
      this.svg = svg;
      this.visible = true;
      this.geometry = this.readGeometry();
      this.root = this.drawHand();
      this.lastPose = null;
    }

    readGeometry() {
      const strings = [...this.svg.querySelectorAll("[data-string-index] line")];
      const frets = [...this.svg.querySelectorAll("[data-fret]")];
      const nut = this.svg.querySelector(".fretboard-master__nut rect");
      if (strings.length !== 6 || !frets.length || !nut) throw new Error("El mástil no expone su geometría completa.");
      const stringY = strings.map((string) => number(string, "y1"));
      const fretX = frets.map((fret) => number(fret, "x") + (number(fret, "width") / 2));
      const nutX = number(nut, "x") + (number(nut, "width") / 2);
      return {
        stringY,
        fretX,
        nutX,
        spacing: Math.abs(stringY[1] - stringY[0]),
        bottom: Math.max(...stringY) + Math.abs(stringY[1] - stringY[0]),
        width: this.svg.viewBox.baseVal.width
      };
    }

    addDefinitions() {
      let definitions = this.svg.querySelector("defs");
      if (!definitions) {
        definitions = node("defs");
        this.svg.prepend(definitions);
      }
      const skin = node("linearGradient", { id: "hand-skin", x1: 0, y1: 0, x2: 1, y2: 1 });
      skin.append(node("stop", { "stop-color": "#f3c3a4" }), node("stop", { offset: .55, "stop-color": "#d99874" }), node("stop", { offset: 1, "stop-color": "#a96049" }));
      const litSkin = node("linearGradient", { id: "hand-finger", x1: 0, y1: 0, x2: 0, y2: 1 });
      litSkin.append(node("stop", { "stop-color": "#ffd1b1" }), node("stop", { offset: .5, "stop-color": "#e7a17e" }), node("stop", { offset: 1, "stop-color": "#b96950" }));
      definitions.append(skin, litSkin);
    }

    drawHand() {
      this.addDefinitions();
      const root = node("g", { class: "hand-engine", "aria-hidden": "true", "pointer-events": "none", opacity: 0 });
      const wrist = node("path", { class: "hand-engine__wrist", d: "M-48 72 C-45 48 -37 29 -24 17 C-8 3 18 6 36 21 C50 33 56 53 59 79 L56 116 L-50 116 Z" });
      const palm = node("path", { class: "hand-engine__palm", d: "M-45 72 C-49 42 -43 8 -30 -15 C-20 -34 1 -44 23 -35 C44 -27 54 -8 57 17 L60 68 C58 89 42 103 18 106 L-14 104 C-34 99 -43 89 -45 72 Z" });
      const palmHighlight = node("path", { class: "hand-engine__crease", d: "M-26 66 C-12 51 15 47 39 59 M-28 82 C-7 72 20 74 40 86 M-26 22 C-10 11 17 10 35 25" });
      root.append(wrist, palm, palmHighlight);

      this.fingers = {};
      const fingerPaths = {
        index: "M-11 13 C-15 -7 -14 -56 -10 -75 C-8 -88 7 -94 16 -84 C22 -77 20 -64 18 -51 L15 9 C13 23 -7 27 -11 13 Z",
        middle: "M-12 12 C-15 -13 -14 -72 -9 -94 C-6 -108 10 -112 19 -101 C25 -93 22 -78 20 -64 L16 8 C14 23 -8 27 -12 12 Z",
        ring: "M-11 13 C-14 -9 -13 -62 -9 -82 C-6 -96 9 -99 18 -89 C24 -81 21 -68 20 -55 L16 10 C14 24 -7 27 -11 13 Z",
        little: "M-10 13 C-13 -5 -12 -45 -8 -63 C-5 -75 8 -79 16 -69 C21 -62 19 -51 18 -41 L15 10 C13 23 -6 26 -10 13 Z"
      };
      const origins = [-31, -8, 15, 37];
      FINGERS.forEach((name, index) => {
        const group = node("g", { class: `hand-engine__finger hand-engine__finger--${name}`, transform: `translate(${origins[index]} 0)` });
        group.append(node("path", { d: fingerPaths[name] }), node("path", { class: "hand-engine__nail", d: "M-7 -73 C-3 -82 8 -84 13 -75 L12 -66 C7 -62 -2 -62 -7 -67 Z" }), node("path", { class: "hand-engine__joint", d: "M-7 -36 C0 -32 8 -32 14 -36" }));
        root.append(group);
        this.fingers[name] = group;
      });

      // A hooked thumb above the neck makes the silhouette unmistakably left-handed.
      const thumb = node("g", { class: "hand-engine__thumb" });
      thumb.append(node("path", { d: "M-30 12 C-55 -8 -69 -45 -74 -91 C-77 -121 -76 -158 -66 -184 C-61 -198 -47 -202 -37 -193 C-27 -184 -31 -166 -34 -150 C-39 -116 -34 -74 -17 -42 L-4 -9 C-4 4 -16 14 -30 12 Z" }), node("path", { class: "hand-engine__nail", d: "M-65 -188 C-59 -197 -47 -198 -40 -190 C-40 -180 -50 -174 -61 -178 Z" }));
      root.append(thumb);
      this.svg.append(root);
      return root;
    }

    setVisible(visible) { this.visible = Boolean(visible); }

    positionFor(note) {
      if (note.fret === 0) return 1;
      return Math.max(1, Math.min(note.fret, 9));
    }

    fingerFor(note, position) {
      if (note.fret === 0) return -1;
      return Math.max(0, Math.min(3, note.fret - position));
    }

    anchorFor(position) {
      const centers = FINGERS.map((_, finger) => this.fretCenter(position + finger));
      return centers.reduce((total, center) => total + center, 0) / centers.length;
    }

    fretCenter(fret) {
      const bounded = Math.max(1, Math.min(fret, this.geometry.fretX.length));
      const left = bounded === 1 ? this.geometry.nutX : this.geometry.fretX[bounded - 2];
      return (left + this.geometry.fretX[bounded - 1]) / 2;
    }

    layout(sequence) {
      const firstFretted = sequence.find((note) => note.fret > 0);
      let position = firstFretted ? this.positionFor(firstFretted) : 1;
      return sequence.map((note) => {
        if (note.fret > 0 && (note.fret < position || note.fret > position + 3)) position = this.positionFor(note);
        return { ...note, handPosition: position, finger: this.fingerFor(note, position), anchorX: this.anchorFor(position) };
      });
    }

    playbackDuration(sequence) {
      const last = sequence[sequence.length - 1];
      return ENTRY_MS + last.time + last.duration + RELEASE_MS;
    }

    lessonTime(elapsed) { return elapsed - ENTRY_MS; }

    poseAt(rawSequence, elapsed) {
      const sequence = this.layout(rawSequence);
      const first = sequence[0];
      if (elapsed < ENTRY_MS) return { x: mix(-150, first.anchorX, elapsed / ENTRY_MS), opacity: smooth(elapsed / 320), note: null, pressure: 0, position: first.handPosition };
      const time = elapsed - ENTRY_MS;
      let previous = first;
      for (let index = 0; index < sequence.length; index += 1) {
        const current = sequence[index];
        const end = current.time + current.duration;
        if (time < current.time) {
          const gap = Math.max(1, current.time - (previous.time + previous.duration));
          const progress = clamp((time - previous.time - previous.duration) / gap);
          return { x: mix(previous.anchorX, current.anchorX, progress), opacity: 1, note: progress < .72 ? previous : current, pressure: 0, position: progress < .5 ? previous.handPosition : current.handPosition };
        }
        if (time <= end) {
          const attack = smooth((time - current.time) / Math.min(110, Math.max(1, current.duration * .3)));
          const release = time > end - RELEASE_MS ? clamp((end - time) / RELEASE_MS) : 1;
          return { x: current.anchorX, opacity: 1, note: current, pressure: Math.min(attack, release), position: current.handPosition };
        }
        previous = current;
      }
      return { x: previous.anchorX, opacity: 1, note: previous, pressure: 0, position: previous.handPosition };
    }

    render(pose) {
      this.lastPose = pose;
      const scale = this.geometry.spacing / 34;
      const baseY = this.geometry.bottom + (29 * scale);
      this.root.setAttribute("transform", `translate(${pose.x} ${baseY}) scale(${scale})`);
      this.root.setAttribute("opacity", String(this.visible ? pose.opacity : 0));
      const activeFinger = pose.note?.finger ?? -1;
      FINGERS.forEach((name, index) => {
        const finger = this.fingers[name];
        const active = index === activeFinger;
        const targetY = active ? pose.note.y : null;
        const fingerX = (this.fretCenter(pose.position + index) - pose.x) / scale;
        const neutralTipY = baseY - ((75 + (index === 1 ? 20 : 0)) * scale);
        const travel = active ? (targetY - neutralTipY) / scale : 0;
        finger.setAttribute("transform", `translate(${fingerX} ${travel * pose.pressure})`);
        finger.classList.toggle("is-pressing", active && pose.pressure > .08);
      });
    }

    resetOffscreen() {
      this.render({ x: -150, opacity: 0, note: null, pressure: 0, position: 1 });
    }
  }

  global.PlayFret = global.PlayFret || {};
  global.PlayFret.HandEngine = HandEngine;
  if (typeof module !== "undefined" && module.exports) module.exports = HandEngine;
}(typeof globalThis !== "undefined" ? globalThis : window));
