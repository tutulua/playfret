/** Small, dependency-free module for the fretboard UI. */
(function guitarModule(global) {
  "use strict";

  function describeFretboard(element) {
    const strings = element.querySelectorAll(".strings path").length;
    element.dataset.strings = String(strings);
    return strings;
  }

  global.PlayFret = global.PlayFret || {};
  global.PlayFret.Guitar = { describeFretboard };
}(window));
