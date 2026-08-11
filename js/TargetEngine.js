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
    constructor(radius, role) {
      this.element = svgNode("g", {
        "aria-hidden": "true",
        "data-target-role": role
      });
      this.circle = svgNode("circle", { r: radius, "data-target-marker": "" });
      this.fingerHint = svgNode("text", {
        class: "target-finger-hint",
        "data-target-finger": "",
        dy: ".35em",
        "text-anchor": "middle"
      });
      this.element.append(this.circle, this.fingerHint);
      this.element.style.display = "none";
      this.element.style.pointerEvents = "none";
      this.setRole(role, false);
      this.element.activate = () => this.activate();
      this.element.getCollisionBounds = () => this.getCollisionBounds();
    }

    setRole(role, transition = true) {
      const isCurrent = role === "current";
      this.element.setAttribute("data-target-role", role);
      this.circle.setAttribute("r", isCurrent ? "6" : "5");
      this.circle.style.transition = transition
        ? "fill 180ms ease, stroke 180ms ease, stroke-width 180ms ease, opacity 180ms ease, filter 180ms ease"
        : "none";
      this.circle.style.fill = isCurrent ? "#dfff74" : "#FFC83D";
      this.circle.style.stroke = isCurrent ? "rgba(86, 213, 102, .82)" : "rgba(255, 200, 61, .16)";
      this.circle.style.strokeWidth = isCurrent ? "20px" : "16px";
      this.circle.style.opacity = isCurrent ? "1" : ".45";
      this.circle.style.filter = isCurrent
        ? "drop-shadow(0 0 7px rgba(66, 211, 107, .24))"
        : "drop-shadow(0 0 4px rgba(255, 200, 61, .12))";
      this.fingerHint.style.fontSize = isCurrent ? "14px" : "12px";
      this.circle.classList.toggle("target-marker", isCurrent);
      if (!isCurrent) this.circle.classList.remove("target-marker--active");
    }

    setFinger(finger) {
      const hasFinger = Number.isInteger(finger) && finger >= 1 && finger <= 4;
      this.fingerHint.textContent = hasFinger ? String(finger) : "";
      this.fingerHint.style.display = hasFinger ? "" : "none";
    }

    activate() {
      this.circle.classList.remove("target-marker--active");
      void this.circle.getBoundingClientRect();
      this.circle.classList.add("target-marker--active");
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
      this.currentIndex = -1;
      this.point = this.createPoint("current");
      this.nextPoint = this.createPoint("next");
      this.tick = this.tick.bind(this);
    }

    setSequence(notes) {
      if (!Array.isArray(notes)) throw new TypeError("TargetEngine requiere un array de notas.");
      this.stop();
      this.sequence = Object.freeze(notes.map((note, index) => {
        const valid = TargetEngine.validateNote(note, index);
        return Object.freeze({ ...valid, ...this.getPosition(valid.string, valid.fret) });
      }));
      this.currentIndex = -1;
      this.renderPreview();
    }

    setGuidePointVisible(visible) {
      this.showGuidePoint = Boolean(visible);
      if (!this.showGuidePoint) this.hidePoints();
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
      this.hidePoints();
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
      if (!this.sequence.length) {
        this.hidePoints();
        return;
      }
      this.renderTargets(0, false);
    }

    renderPointAt(lessonTime) {
      let index = this.sequence.findIndex((candidate) => candidate.time > lessonTime) - 1;
      if (index < 0) index = this.sequence.length - 1;
      if (lessonTime < this.sequence[0].time) index = 0;
      this.renderTargets(index, index !== this.currentIndex);
    }

    renderTargets(index, promote) {
      if (!this.showGuidePoint || !this.sequence[index]) {
        this.hidePoints();
        return;
      }

      if (promote && this.currentIndex >= 0 && index === this.currentIndex + 1) {
        const previous = this.point;
        this.point = this.nextPoint;
        this.nextPoint = previous;
        this.point.marker.setRole("current");
        this.point.activate();
      } else {
        this.point.marker.setRole("current", false);
        this.positionPoint(this.point, this.sequence[index]);
      }

      this.currentIndex = index;
      this.point.style.display = "";
      const next = this.sequence[index + 1];
      if (next) {
        this.nextPoint.marker.setRole("next", false);
        this.positionPoint(this.nextPoint, next);
        this.nextPoint.style.display = "";
      } else {
        this.nextPoint.style.display = "none";
      }
    }

    positionPoint(point, note) {
      point.setAttribute("transform", `translate(${note.x} ${note.y})`);
      point.marker.setFinger(note.finger);
    }

    hidePoints() {
      this.point.style.display = "none";
      this.nextPoint.style.display = "none";
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

    createPoint(role) {
      const strings = [...this.svg.querySelectorAll("[data-string-index] line")];
      if (strings.length < 2) throw new Error("El mástil no expone la separación entre cuerdas.");
      // The core plus its stroke forms the requested 32-unit or 26-unit marker.
      const marker = new TargetMarker(role === "current" ? 6 : 5, role);
      const point = marker.element;
      point.marker = marker;
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
      const finger = Number.isInteger(note.finger) && note.finger >= 1 && note.finger <= 4
        ? note.finger
        : undefined;
      return { string: note.string, fret: note.fret, time: note.time, duration: note.duration, finger };
    }
  }

  global.PlayFret = global.PlayFret || {};
  global.PlayFret.TargetEngine = TargetEngine;
  if (typeof module !== "undefined" && module.exports) module.exports = TargetEngine;
}(typeof globalThis !== "undefined" ? globalThis : window));
