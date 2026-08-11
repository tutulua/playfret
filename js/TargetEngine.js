/** Coordinates lesson targets and renders the animated guide hand. */
(function targetEngineModule(global) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const ENTRY_DURATION_MS = 600;
  const RELEASE_DURATION_MS = 180;

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

  function ease(progress) {
    const bounded = Math.max(0, Math.min(1, progress));
    return bounded * bounded * (3 - (2 * bounded));
  }

  class HandEngine {
    constructor(svg) {
      this.svg = svg;
      this.visible = true;
      this.guide = null;
      this.geometry = this.readGeometry();
      this.createHand();
    }

    readGeometry() {
      const viewBox = this.svg.viewBox.baseVal;
      const strings = [...this.svg.querySelectorAll("[data-string-index] line")];
      if (!viewBox.width || strings.length < 2) throw new Error("El mástil SVG no expone geometría suficiente.");

      const stringYs = strings.map((line) => numberAttribute(line, "y1"));
      const spacing = Math.abs(stringYs[1] - stringYs[0]);
      const nut = this.svg.querySelector(".fretboard-master__nut rect");
      const frets = [...this.svg.querySelectorAll("[data-fret]")];
      const fretCenters = frets.map((fret) => numberAttribute(fret, "x") + (numberAttribute(fret, "width") / 2));
      const nutCenter = numberAttribute(nut, "x") + (numberAttribute(nut, "width") / 2);
      const firstCellWidth = fretCenters[0] - nutCenter;

      return {
        top: viewBox.y,
        spacing,
        handScale: Math.min(spacing, firstCellWidth) / 42
      };
    }

    createHand() {
      const group = svgNode("g", {
        class: "guide-hand",
        "aria-hidden": "true",
        "pointer-events": "none"
      });
      const shadow = svgNode("g", { class: "guide-hand__shape" });

      // All three anatomical parts are paths so the guide is never represented by an ellipse.
      const palm = svgNode("path", {
        class: "guide-hand__palm",
        d: "M-16 -4 C-18 -17 -12 -27 0 -29 C12 -27 18 -17 16 -4 L13 18 C10 27 -10 27 -13 18 Z"
      });
      const index = svgNode("path", {
        class: "guide-hand__index",
        d: "M-7 -5 L-6 -38 C-6 -47 6 -47 7 -38 L7 2 C6 9 -6 9 -7 2 Z"
      });
      const thumb = svgNode("path", {
        class: "guide-hand__thumb",
        d: "M-12 1 C-22 -5 -28 -1 -26 6 C-23 13 -14 16 -7 13 L-3 8 Z"
      });

      shadow.append(palm, index, thumb);
      group.append(shadow);
      this.svg.append(group);
      this.guide = group;
      this.setVisible(this.visible);
    }

    setVisible(visible) {
      this.visible = Boolean(visible);
      if (this.guide) this.guide.style.display = this.visible ? "" : "none";
    }

    render(pose) {
      if (!this.visible) return;
      const scale = this.geometry.handScale;
      this.guide.setAttribute(
        "transform",
        `translate(${pose.x} ${pose.y}) scale(${scale})`
      );
      this.guide.classList.toggle("is-pressing", pose.pressing);
    }

    entryPose(target, progress) {
      const raisedY = target.y - this.geometry.spacing;
      return {
        x: target.x,
        y: mix(this.geometry.top - (this.geometry.spacing * 2), raisedY, ease(progress)),
        pressing: false
      };
    }

    transitionPose(from, to, progress) {
      const raisedFrom = from.y - this.geometry.spacing;
      const raisedTo = to.y - this.geometry.spacing;
      const phase = Math.max(0, Math.min(1, progress));

      if (phase < 0.25) {
        return { x: from.x, y: mix(from.y, raisedFrom, ease(phase / 0.25)), pressing: false };
      }
      if (phase < 0.75) {
        const travel = ease((phase - 0.25) / 0.5);
        return { x: mix(from.x, to.x, travel), y: mix(raisedFrom, raisedTo, travel), pressing: false };
      }
      return { x: to.x, y: mix(raisedTo, to.y, ease((phase - 0.75) / 0.25)), pressing: false };
    }

    calculatePose(targets, elapsed, leadIn) {
      const first = targets[0];
      if (elapsed < leadIn) return this.entryPose(first, elapsed / leadIn);

      const lessonTime = elapsed - leadIn;
      for (let index = 0; index < targets.length; index += 1) {
        const current = targets[index];
        const pressEnd = current.time + current.duration;
        const next = targets[index + 1];
        if (lessonTime >= current.time && lessonTime <= pressEnd) {
          return { x: current.x, y: current.y, pressing: true };
        }
        if (next && lessonTime > pressEnd && lessonTime < next.time) {
          return this.transitionPose(current, next, (lessonTime - pressEnd) / (next.time - pressEnd));
        }
        if (next && lessonTime < next.time && index === 0 && lessonTime < current.time) {
          return this.transitionPose(current, next, 0);
        }
      }

      const last = targets[targets.length - 1];
      return { x: last.x, y: last.y - this.geometry.spacing, pressing: false };
    }

    poseAt(targets, elapsed) {
      return this.calculatePose(targets, elapsed, ENTRY_DURATION_MS);
    }

    playbackDuration(targets) {
      const last = targets[targets.length - 1];
      return ENTRY_DURATION_MS + last.time + last.duration + RELEASE_DURATION_MS;
    }

    lessonTime(elapsed) {
      return elapsed - ENTRY_DURATION_MS;
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
      this.hand = new HandEngine(this.svg);
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

    setHandVisible(visible) {
      this.hand.setVisible(visible);
      if (visible && !this.isPlaying) this.renderPreview();
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
      const total = this.hand.playbackDuration(this.sequence);
      const pose = this.hand.poseAt(this.sequence, elapsed);
      this.hand.render(pose);
      this.renderPointAt(this.hand.lessonTime(elapsed));

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
      this.hand.render({ x: first.x, y: first.y - this.hand.geometry.spacing, pressing: false });
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
      const point = svgNode("circle", {
        class: "guide-point",
        r: this.hand.geometry.spacing * 0.3,
        "aria-hidden": "true"
      });
      point.style.display = "none";
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
