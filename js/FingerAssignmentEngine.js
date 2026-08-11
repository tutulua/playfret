/** Assigns left-hand fingers to notes without rendering a hand. */
(function fingerAssignmentEngineModule(global) {
  "use strict";

  const FIRST_FINGER = 1;
  const LAST_FINGER = 4;

  class FingerAssignmentEngine {
    /**
     * @param {{ initialFret?: number }} options The lowest fret covered by the
     * initial four-fret hand position.
     */
    constructor({ initialFret = 3 } = {}) {
      if (!Number.isInteger(initialFret) || initialFret < 1) {
        throw new RangeError("FingerAssignmentEngine requires a positive initial fret.");
      }

      this.initialFret = initialFret;
      this.position = initialFret;
    }

    /** Restores the hand to its configured initial position. */
    reset() {
      this.position = this.initialFret;
    }

    /**
     * Assigns a finger to one note and updates the hand position when needed.
     * Open strings use finger 0 because no fretting finger is required.
     */
    assignFinger(note) {
      const validNote = FingerAssignmentEngine.validateNote(note);

      if (validNote.fret === 0) {
        return Object.freeze({ ...note, ...validNote, finger: 0 });
      }

      const lastFretInPosition = this.position + LAST_FINGER - FIRST_FINGER;
      if (validNote.fret < this.position || validNote.fret > lastFretInPosition) {
        this.position = validNote.fret;
      }

      return Object.freeze({
        ...note,
        ...validNote,
        finger: validNote.fret - this.position + FIRST_FINGER
      });
    }

    /** Assigns a complete sequence from the initial hand position. */
    assign(notes) {
      if (!Array.isArray(notes)) {
        throw new TypeError("FingerAssignmentEngine requires an array of notes.");
      }

      this.reset();
      return Object.freeze(notes.map((note) => this.assignFinger(note)));
    }

    /** Descriptive alias for consumers that prefer an explicit method name. */
    assignSequence(notes) {
      return this.assign(notes);
    }

    static validateNote(note) {
      if (!note || typeof note !== "object" || Array.isArray(note)) {
        throw new TypeError("A note must be an object.");
      }
      if (!Number.isInteger(note.string) || note.string < 1 || note.string > 6) {
        throw new RangeError("A note requires a string from 1 to 6.");
      }
      if (!Number.isInteger(note.fret) || note.fret < 0) {
        throw new RangeError("A note requires a non-negative fret.");
      }

      return { string: note.string, fret: note.fret };
    }
  }

  global.PlayFret = global.PlayFret || {};
  global.PlayFret.FingerAssignmentEngine = FingerAssignmentEngine;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = FingerAssignmentEngine;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
