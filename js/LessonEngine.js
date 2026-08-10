/**
 * LessonEngine stores and traverses the timeline of a PlayFret lesson.
 *
 * Events are validated and sorted once when a lesson is loaded. Playback then
 * advances with a numeric cursor, making each call to getNextEvent O(1) even
 * when a lesson contains thousands of notes.
 */
(function lessonEngineModule(global) {
  "use strict";

  class LessonEngine {
    /**
     * @param {{ fetcher?: Function }} options Dependency injection keeps data
     * loading independent from the browser and makes the engine easy to test.
     */
    constructor({ fetcher = global.fetch } = {}) {
      this.fetcher = fetcher;
      this.info = null;
      this.events = Object.freeze([]);
      this.cursor = 0;
    }

    /**
     * Loads a lesson from a URL or from an already parsed JSON object.
     * @param {string|object} source
     * @returns {Promise<LessonEngine>}
     */
    async load(source) {
      const lesson = typeof source === "string" ? await this.fetchLesson(source) : source;
      this.setLesson(lesson);
      return this;
    }

    async fetchLesson(url) {
      if (typeof this.fetcher !== "function") {
        throw new Error("LessonEngine requires a fetch implementation to load a URL.");
      }

      const response = await this.fetcher.call(global, url);
      if (!response.ok) {
        throw new Error(`Unable to load lesson (${response.status} ${response.statusText}).`);
      }
      return response.json();
    }

    setLesson(lesson) {
      if (!lesson || typeof lesson !== "object" || Array.isArray(lesson)) {
        throw new TypeError("A lesson must be a JSON object.");
      }
      if (!Array.isArray(lesson.events)) {
        throw new TypeError("A lesson must contain an events array.");
      }

      const decoratedEvents = lesson.events.map((event, originalIndex) => {
        if (!event || typeof event !== "object" || !Number.isFinite(event.timeMs) || event.timeMs < 0) {
          throw new TypeError(`Event ${originalIndex} must have a non-negative numeric timeMs.`);
        }
        return { event: Object.freeze({ ...event }), originalIndex };
      });

      decoratedEvents.sort((left, right) =>
        left.event.timeMs - right.event.timeMs || left.originalIndex - right.originalIndex
      );

      const { events: ignoredEvents, ...generalInfo } = lesson;
      this.info = Object.freeze({ ...generalInfo });
      this.events = Object.freeze(decoratedEvents.map(({ event }) => event));
      this.reset();
    }

    /** Returns immutable lesson metadata, excluding the event timeline. */
    getInfo() {
      this.assertLoaded();
      return this.info;
    }

    /** Returns the immutable, chronologically sorted event timeline. */
    getEvents() {
      this.assertLoaded();
      return this.events;
    }

    /** Returns the next event in O(1), or null after the timeline ends. */
    getNextEvent() {
      this.assertLoaded();
      if (this.cursor >= this.events.length) return null;
      const event = this.events[this.cursor];
      this.cursor += 1;
      return event;
    }

    /** Moves playback back to the first event without reloading or re-sorting. */
    reset() {
      this.cursor = 0;
    }

    assertLoaded() {
      if (this.info === null) {
        throw new Error("Load a lesson before reading from LessonEngine.");
      }
    }
  }

  global.PlayFret = global.PlayFret || {};
  global.PlayFret.LessonEngine = LessonEngine;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = LessonEngine;
  }
}(typeof globalThis !== "undefined" ? globalThis : window));
