import type { StylusPlugin } from "./types/stylus-interop";

const isList = function (): StylusPlugin {
  return function (style) {
    style.define("is-lists", function () {
      console.log(arguments);
    });
  };
};

export = isList;
