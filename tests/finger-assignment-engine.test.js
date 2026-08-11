"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const FingerAssignmentEngine = require("../js/FingerAssignmentEngine.js");

test("assigns consecutive frets to fingers in the initial position", () => {
  const engine = new FingerAssignmentEngine();
  const notes = [3, 4, 5, 6].map((fret) => ({ string: 4, fret }));

  assert.deepEqual(engine.assign(notes), [
    { string: 4, fret: 3, finger: 1 },
    { string: 4, fret: 4, finger: 2 },
    { string: 4, fret: 5, finger: 3 },
    { string: 4, fret: 6, finger: 4 }
  ]);
});

test("moves the hand automatically after a fret jump", () => {
  const engine = new FingerAssignmentEngine();

  assert.deepEqual(engine.assign([
    { string: 4, fret: 3 },
    { string: 4, fret: 7 },
    { string: 3, fret: 9 }
  ]), [
    { string: 4, fret: 3, finger: 1 },
    { string: 4, fret: 7, finger: 1 },
    { string: 3, fret: 9, finger: 3 }
  ]);
});

test("preserves note data and leaves open strings unfingered", () => {
  const engine = new FingerAssignmentEngine();

  assert.deepEqual(engine.assign([{ string: 2, fret: 0, timeMs: 100 }]), [
    { string: 2, fret: 0, timeMs: 100, finger: 0 }
  ]);
});

test("validates notes and sequence input", () => {
  const engine = new FingerAssignmentEngine();

  assert.throws(() => engine.assign(null), /array/);
  assert.throws(() => engine.assign([{ string: 7, fret: 3 }]), /string from 1 to 6/);
  assert.throws(() => engine.assign([{ string: 1, fret: -1 }]), /non-negative fret/);
});
