/** PlayFret application bootstrap. Kept framework-free for file:// use. */
(function appModule(global) {
  "use strict";

  const LESSON_URL = "lessons/smoke-on-the-water.json";

  function loadTargetEngine() {
    if (global.PlayFret?.TargetEngine) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "js/TargetEngine.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("No se pudo cargar TargetEngine."));
      document.head.append(script);
    });
  }

  async function init() {
    const fretboard = document.querySelector("[data-fretboard]");
    if (fretboard && window.PlayFret?.FretboardMaster) {
      window.PlayFret.FretboardMaster.mount(fretboard);
    }

    const playButton = document.querySelector(".play-button");
    if (!fretboard || !playButton || !global.PlayFret?.LessonEngine) return;

    try {
      await loadTargetEngine();
      const lesson = new global.PlayFret.LessonEngine();
      await lesson.load(LESSON_URL);

      const target = new global.PlayFret.TargetEngine(fretboard);
      target.setSequence(lesson.getEvents().map(({ string, fret, durationMs }) => ({
        string,
        fret,
        duration: durationMs
      })));

      playButton.addEventListener("click", () => target.play());
    } catch (error) {
      console.error("PlayFret no pudo preparar la demostración.", error);
      playButton.disabled = true;
    }
  }

  init();
}(window));
