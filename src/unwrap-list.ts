import stylus = require("stylus");
import type { StylusPlugin } from "./types/stylus-interop";

const utils = stylus.utils;

const unwrapList = function (): StylusPlugin {
  return function (style) {
    style.define("unwrap-list", function (...args: any[]) {
      const unwrapped = args.map((arg) => utils.coerce(arg.val));

      return utils.coerceArray(unwrapped);
    });
  };
};

export = unwrapList;
