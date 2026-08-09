/** PlayFret application bootstrap. Kept framework-free for file:// use. */
(function appModule() {
  "use strict";

  function init() {
    const fretboard = document.querySelector("[data-fretboard]");
    if (fretboard && window.PlayFret?.FretboardMaster) {
      window.PlayFret.FretboardMaster.mount(fretboard);
    }
  }

  init();
}());
