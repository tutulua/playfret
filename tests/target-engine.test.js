"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const TargetEngine = require("../js/TargetEngine.js");

test("preserves only valid finger assignments for rendering", () => {
  const note = { string: 4, fret: 5, time: 0, duration: 100, finger: 3 };

  assert.equal(TargetEngine.validateNote(note, 0).finger, 3);
  assert.equal(TargetEngine.validateNote({ ...note, finger: 0 }, 0).finger, undefined);
  assert.equal(TargetEngine.validateNote({ ...note, finger: 5 }, 0).finger, undefined);
  assert.equal(TargetEngine.validateNote({ ...note, finger: "3" }, 0).finger, undefined);
});
