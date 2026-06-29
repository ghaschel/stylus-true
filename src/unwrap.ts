import stylus = require("stylus");
import type { StylusPlugin } from "./types/stylus-interop";

const utils = stylus.utils;

const unwrap = function (): StylusPlugin {
  return function (style) {
    style.define("unwrap", function (...args: any[]) {
      return utils.unwrap(args[0]);
    });
  };
};

export = unwrap;
