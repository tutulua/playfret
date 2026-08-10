"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const LessonEngine = require("../js/LessonEngine.js");

test("loads metadata and sorts events without changing equal-time order", async () => {
  const engine = new LessonEngine();
  await engine.load({
    id: "test-lesson",
    title: "Test lesson",
    events: [
      { timeMs: 200, note: "C" },
      { timeMs: 100, note: "A" },
      { timeMs: 100, note: "B" }
    ]
  });

  assert.deepEqual(engine.getInfo(), { id: "test-lesson", title: "Test lesson" });
  assert.deepEqual(engine.getEvents().map(({ note }) => note), ["A", "B", "C"]);
  assert.ok(Object.isFrozen(engine.getEvents()));
});

test("advances through events and resets playback", async () => {
  const engine = new LessonEngine();
  await engine.load({ events: [{ timeMs: 20 }, { timeMs: 10 }] });

  assert.equal(engine.getNextEvent().timeMs, 10);
  assert.equal(engine.getNextEvent().timeMs, 20);
  assert.equal(engine.getNextEvent(), null);

  engine.reset();
  assert.equal(engine.getNextEvent().timeMs, 10);
});

test("loads JSON through an injected fetcher with the global fetch receiver", async () => {
  const fetcher = async function fetchLesson(url) {
    assert.equal(this, globalThis);
    assert.equal(url, "/lessons/example.json");
    return {
      ok: true,
      json: async () => ({ title: "Fetched", events: [{ timeMs: 0 }] })
    };
  };
  const engine = new LessonEngine({ fetcher });

  await engine.load("/lessons/example.json");

  assert.equal(engine.getInfo().title, "Fetched");
});

test("rejects malformed lessons and events", async () => {
  const engine = new LessonEngine();

  await assert.rejects(engine.load({}), /events array/);
  await assert.rejects(engine.load({ events: [{ timeMs: -1 }] }), /non-negative/);
  assert.throws(() => engine.getInfo(), /Load a lesson/);
});
