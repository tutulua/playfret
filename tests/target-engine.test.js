"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const TargetEngine = require("../js/TargetEngine.js");

class FakeSvgNode {
  constructor(name) {
    this.name = name;
    this.attributes = new Map();
    this.children = [];
    this.style = {};
    this.classList = {
      values: new Set(),
      add: (value) => this.classList.values.add(value),
      remove: (value) => this.classList.values.delete(value),
      toggle: (value, enabled) => enabled
        ? this.classList.values.add(value)
        : this.classList.values.delete(value),
      contains: (value) => this.classList.values.has(value)
    };
  }

  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name); }
  append(...children) { this.children.push(...children); }
  getBoundingClientRect() { return {}; }
}

test("preserves only valid finger assignments for rendering", () => {
  const note = { string: 4, fret: 5, time: 0, duration: 100, finger: 3 };

  assert.equal(TargetEngine.validateNote(note, 0).finger, 3);
  assert.equal(TargetEngine.validateNote({ ...note, finger: 0 }, 0).finger, undefined);
  assert.equal(TargetEngine.validateNote({ ...note, finger: 5 }, 0).finger, undefined);
  assert.equal(TargetEngine.validateNote({ ...note, finger: "3" }, 0).finger, undefined);
});

test("animates the target circle without replacing the group position or finger hint", () => {
  const previousDocument = global.document;
  global.document = { createElementNS: (_namespace, name) => new FakeSvgNode(name) };

  try {
    const svg = new FakeSvgNode("svg");
    svg.querySelectorAll = () => [new FakeSvgNode("line"), new FakeSvgNode("line")];
    const container = { querySelector: () => svg };
    const engine = new TargetEngine(container);
    const [circle, fingerHint] = engine.point.children;

    engine.point.setAttribute("transform", "translate(120 80)");
    engine.point.activate();

    assert.equal(engine.point.getAttribute("transform"), "translate(120 80)");
    assert.equal(engine.point.classList.contains("target-marker--active"), false);
    assert.equal(circle.classList.contains("target-marker--active"), true);
    assert.equal(fingerHint.name, "text");
  } finally {
    global.document = previousDocument;
  }
});
