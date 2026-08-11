/** Coordinates and renders lesson targets on the PlayFret fretboard. */
(function targetEngineModule(global) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  function svgNode(name, attributes = {}) {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attributes).forEach(([attribute, value]) => node.setAttribute(attribute, String(value)));
    return node;
  }

  function numberAttribute(node, name) {
    const value = Number(node?.getAttribute(name));
    if (!Number.isFinite(value)) throw new Error(`La geometría SVG no contiene ${name}.`);
    return value;
  }

  function mix(from, to, progress) {
    return from + ((to - from) * progress);
  }

  /** Visual target component. Its hit area is exposed for future hand collisions. */
  class TargetMarker {
    constructor(radius) {
      this.element = svgNode("circle", {
        class: "target-marker",
        r: radius,
        "aria-hidden": "true",
        "data-target-marker": ""
      });
      this.element.style.display = "none";
      this.element.activate = () => this.activate();
      this.element.getCollisionBounds = () => this.getCollisionBounds();
    }

    activate() {
      this.element.classList.remove("target-marker--active");
      void this.element.getBoundingClientRect();
      this.element.classList.add("target-marker--active");
    }

    getCollisionBounds() {
      return this.element.getBoundingClientRect();
    }
  }


  class TargetEngine {
    constructor(fretboardContainer, options = {}) {
      if (!fretboardContainer) throw new TypeError("TargetEngine requiere un contenedor de mástil.");
      this.container = fretboardContainer;
      this.svg = this.container.querySelector(".fretboard-master");
      if (!this.svg) throw new Error("Monta FretboardMaster antes de usar TargetEngine.");

      this.sequence = Object.freeze([]);
      this.frame = null;
      this.startedAt = 0;
      this.isPlaying = false;
      this.showGuidePoint = Boolean(options.showGuidePoint);
      this.point = this.createPoint();
      this.tick = this.tick.bind(this);
    }

    setSequence(notes) {
      if (!Array.isArray(notes)) throw new TypeError("TargetEngine requiere un array de notas.");
      this.stop();
      this.sequence = Object.freeze(notes.map((note, index) => {
        const valid = TargetEngine.validateNote(note, index);
        return Object.freeze({ ...valid, ...this.getPosition(valid.string, valid.fret) });
      }));
      this.renderPreview();
    }

    setGuidePointVisible(visible) {
      this.showGuidePoint = Boolean(visible);
      if (!this.showGuidePoint) this.point.style.display = "none";
      else if (!this.isPlaying) this.renderPreview();
    }

    play() {
      if (this.isPlaying || this.sequence.length === 0) return;
      this.isPlaying = true;
      this.startedAt = global.performance.now();
      this.frame = global.requestAnimationFrame(this.tick);
    }

    stop() {
      if (this.frame !== null) global.cancelAnimationFrame(this.frame);
      this.frame = null;
      this.isPlaying = false;
      this.point.style.display = "none";
    }

    tick(now) {
      if (!this.isPlaying) return;
      const elapsed = now - this.startedAt;
      const last = this.sequence[this.sequence.length - 1];
      const total = last.time + last.duration;
      this.renderPointAt(elapsed);

      if (elapsed < total) {
        this.frame = global.requestAnimationFrame(this.tick);
      } else {
        this.stop();
        this.renderPreview();
      }
    }

    renderPreview() {
      if (!this.sequence.length) return;
      const first = this.sequence[0];
      this.renderPoint(first);
    }

    renderPointAt(lessonTime) {
      const note = this.sequence.find((candidate) =>
        lessonTime >= candidate.time && lessonTime <= candidate.time + candidate.duration
      );
      if (note) this.renderPoint(note);
      else this.point.style.display = "none";
    }

    renderPoint(note) {
      if (!this.showGuidePoint) return;
      this.point.setAttribute("cx", String(note.x));
      this.point.setAttribute("cy", String(note.y));
      this.point.style.display = "";
    }

    getPosition(stringNumber, fretNumber) {
      const string = this.svg.querySelector(`[data-string-index="${stringNumber - 1}"] line`);
      if (!string) throw new RangeError(`La cuerda ${stringNumber} no existe.`);

      const x1 = numberAttribute(string, "x1");
      const x2 = numberAttribute(string, "x2");
      const y1 = numberAttribute(string, "y1");
      const y2 = numberAttribute(string, "y2");
      const nut = this.svg.querySelector(".fretboard-master__nut rect");
      const nutCenter = numberAttribute(nut, "x") + (numberAttribute(nut, "width") / 2);
      let x;

      if (fretNumber === 0) {
        x = mix(x1, nutCenter, 0.5);
      } else {
        const rightFret = this.svg.querySelector(`[data-fret="${fretNumber}"]`);
        if (!rightFret) throw new RangeError(`El traste ${fretNumber} no existe.`);
        const right = numberAttribute(rightFret, "x") + (numberAttribute(rightFret, "width") / 2);
        if (fretNumber === 1) x = mix(nutCenter, right, 0.5);
        else {
          const leftFret = this.svg.querySelector(`[data-fret="${fretNumber - 1}"]`);
          const left = numberAttribute(leftFret, "x") + (numberAttribute(leftFret, "width") / 2);
          x = mix(left, right, 0.5);
        }
      }

      return { x, y: y1 + (((y2 - y1) * (x - x1)) / (x2 - x1)) };
    }

    createPoint() {
      const strings = [...this.svg.querySelectorAll("[data-string-index] line")];
      if (strings.length < 2) throw new Error("El mástil no expone la separación entre cuerdas.");
      // The 12-unit core plus a 10-unit ring on each side forms the 32-unit marker.
      const point = new TargetMarker(6).element;
      this.svg.append(point);
      return point;
    }

    static validateNote(note, index) {
      if (!note || !Number.isInteger(note.string) || note.string < 1 || note.string > 6) {
        throw new RangeError(`La nota ${index} requiere una cuerda del 1 al 6.`);
      }
      if (!Number.isInteger(note.fret) || note.fret < 0) {
        throw new RangeError(`La nota ${index} requiere un traste no negativo.`);
      }
      if (!Number.isFinite(note.time) || note.time < 0) {
        throw new RangeError(`La nota ${index} requiere un tiempo no negativo.`);
      }
      if (!Number.isFinite(note.duration) || note.duration < 0) {
        throw new RangeError(`La nota ${index} requiere una duración no negativa.`);
      }
      return { string: note.string, fret: note.fret, time: note.time, duration: note.duration };
    }
  }

  global.PlayFret = global.PlayFret || {};
  global.PlayFret.TargetEngine = TargetEngine;
  if (typeof module !== "undefined" && module.exports) module.exports = TargetEngine;
}(typeof globalThis !== "undefined" ? globalThis : window));
