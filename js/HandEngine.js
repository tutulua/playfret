/** Anatomical left-hand guide for the PlayFret SVG fretboard. */
(function handEngineModule(global) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const ENTRY_MS = 850;
  const RELEASE_MS = 150;
  const FINGERS = ["index", "middle", "ring", "little"];
  const REFERENCE = "assets/reference/hand_reference.png";
  const REFERENCE_BOX = { x: -128, y: -268, width: 256, height: 268 };

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

    drawHand() {
      const root = node("g", {
        class: "hand-engine",
        "aria-hidden": "true",
        "data-visual-source": REFERENCE,
        "pointer-events": "none",
        opacity: 0
      });
      const artwork = node("image", {
        class: "hand-engine__reference",
        href: REFERENCE,
        x: REFERENCE_BOX.x,
        y: REFERENCE_BOX.y,
        width: REFERENCE_BOX.width,
        height: REFERENCE_BOX.height,
        preserveAspectRatio: "xMidYMax meet"
      });
      root.append(artwork);
      this.artwork = artwork;
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
      const fingerOffset = activeFinger < 0 ? 0 : (activeFinger - 1.5) * 3;
      const pressOffset = pose.pressure * 5;
      this.artwork.setAttribute("transform", `translate(${fingerOffset} ${pressOffset}) rotate(${fingerOffset * .12} 0 0)`);
      this.artwork.classList.toggle("is-pressing", activeFinger >= 0 && pose.pressure > .08);
    }

    resetOffscreen() {
      this.render({ x: -150, opacity: 0, note: null, pressure: 0, position: 1 });
    }
  }

  global.PlayFret = global.PlayFret || {};
  global.PlayFret.HandEngine = HandEngine;
  if (typeof module !== "undefined" && module.exports) module.exports = HandEngine;
}(typeof globalThis !== "undefined" ? globalThis : window));
