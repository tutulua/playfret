/** Renders and schedules the single note target used by PlayFret lessons. */
(function targetEngineModule(global) {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const TARGET_RADIUS = 11;
  const OPEN_STRING_X = 31;

  class TargetEngine {
    /**
     * @param {Element} fretboardContainer Container mounted by FretboardMaster.
     */
    constructor(fretboardContainer) {
      if (!fretboardContainer) throw new TypeError("TargetEngine requires a fretboard container.");

      this.container = fretboardContainer;
      this.sequence = Object.freeze([]);
      this.index = 0;
      this.timer = null;
      this.isPlaying = false;
      this.target = null;
    }

    /** Stores the simple note DTOs consumed by this visual engine. */
    setSequence(notes) {
      if (!Array.isArray(notes)) throw new TypeError("TargetEngine requires a note array.");
      this.stop();
      this.sequence = Object.freeze(notes.map((note, index) =>
        Object.freeze(TargetEngine.validateNote(note, index))
      ));
      this.index = 0;
      this.showFirstTarget();
    }

    /** Starts (or restarts) the visual demonstration from its current target. */
    play() {
      if (this.isPlaying || this.sequence.length === 0) return;
      this.isPlaying = true;
      this.showCurrentTarget();
    }

    /** Stops scheduling without discarding the loaded sequence. */
    stop() {
      if (this.timer !== null) global.clearTimeout(this.timer);
      this.timer = null;
      this.isPlaying = false;
      this.hideTarget();
    }

    showCurrentTarget() {
      const note = this.sequence[this.index];
      if (!note) {
        this.finish();
        return;
      }

      this.render(note.string, note.fret);
      this.timer = global.setTimeout(() => {
        this.hideTarget();
        this.index += 1;
        this.showCurrentTarget();
      }, note.duration);
    }

    finish() {
      this.stop();
      this.index = 0;
      this.showFirstTarget();
    }

    showFirstTarget() {
      if (this.sequence.length > 0) {
        const first = this.sequence[0];
        this.render(first.string, first.fret);
      }
    }

    render(stringNumber, fretNumber) {
      const svg = this.container.querySelector(".fretboard-master");
      if (!svg) throw new Error("Mount FretboardMaster before using TargetEngine.");

      const { x, y } = this.getPosition(svg, stringNumber, fretNumber);
      if (!this.target) this.target = this.createTarget(svg);
      this.target.setAttribute("cx", String(x));
      this.target.setAttribute("cy", String(y));
      this.target.hidden = false;
      this.target.style.display = "";
    }

    hideTarget() {
      if (!this.target) return;
      this.target.hidden = true;
      this.target.style.display = "none";
    }

    getPosition(svg, stringNumber, fretNumber) {
      const string = svg.querySelector(`[data-string-index="${stringNumber - 1}"] line`);
      if (!string) throw new RangeError(`String ${stringNumber} does not exist.`);

      const x = fretNumber === 0 ? OPEN_STRING_X : this.getFretCenter(svg, fretNumber);
      const x1 = Number(string.getAttribute("x1"));
      const y1 = Number(string.getAttribute("y1"));
      const x2 = Number(string.getAttribute("x2"));
      const y2 = Number(string.getAttribute("y2"));
      const y = y1 + ((y2 - y1) * (x - x1) / (x2 - x1));
      return { x, y };
    }

    getFretCenter(svg, fretNumber) {
      const rightFret = svg.querySelector(`[data-fret="${fretNumber}"]`);
      if (!rightFret) throw new RangeError(`Fret ${fretNumber} does not exist.`);
      const right = Number(rightFret.getAttribute("x")) + (Number(rightFret.getAttribute("width")) / 2);

      if (fretNumber === 1) {
        const nut = svg.querySelector(".fretboard-master__nut rect");
        const left = Number(nut.getAttribute("x")) + (Number(nut.getAttribute("width")) / 2);
        return (left + right) / 2;
      }

      const leftFret = svg.querySelector(`[data-fret="${fretNumber - 1}"]`);
      const left = Number(leftFret.getAttribute("x")) + (Number(leftFret.getAttribute("width")) / 2);
      return (left + right) / 2;
    }

    createTarget(svg) {
      const target = document.createElementNS(SVG_NS, "circle");
      target.setAttribute("r", String(TARGET_RADIUS));
      target.setAttribute("fill", "#42d36b");
      target.setAttribute("stroke", "#ffffff");
      target.setAttribute("stroke-width", "1.5");
      target.setAttribute("aria-hidden", "true");
      target.style.filter = "drop-shadow(0 0 5px rgba(66, 211, 107, 0.7))";
      target.style.pointerEvents = "none";
      svg.append(target);
      return target;
    }

    static validateNote(note, index) {
      if (!note || !Number.isInteger(note.string) || note.string < 1 || note.string > 6) {
        throw new RangeError(`Note ${index} requires a string from 1 to 6.`);
      }
      if (!Number.isInteger(note.fret) || note.fret < 0) {
        throw new RangeError(`Note ${index} requires a non-negative fret.`);
      }
      if (!Number.isFinite(note.duration) || note.duration < 0) {
        throw new RangeError(`Note ${index} requires a non-negative duration.`);
      }
      return { string: note.string, fret: note.fret, duration: note.duration };
    }
  }

  global.PlayFret = global.PlayFret || {};
  global.PlayFret.TargetEngine = TargetEngine;

  if (typeof module !== "undefined" && module.exports) module.exports = TargetEngine;
}(typeof globalThis !== "undefined" ? globalThis : window));
