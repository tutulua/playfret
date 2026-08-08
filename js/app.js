/** PlayFret application bootstrap. Kept framework-free for file:// use. */
(function appModule() {
  "use strict";

  function init() {
    const fretboard = document.querySelector(".fretboard");
    if (fretboard && window.PlayFret?.Guitar) {
      window.PlayFret.Guitar.describeFretboard(fretboard);
    }
  }

  init();
}());
