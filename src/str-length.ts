import type { StylusPlugin } from "./types/stylus-interop";

const strLength = function (): StylusPlugin {
  return function (style) {
    style.define("str-length", function (...args: any[]) {
      if (args.length > 1 || args.length === 0) {
        return "NOT_A_STRING";
      }

      const str = args[0];
      if (str.val) {
        return str.val.length;
      }

      return 0;
    });
  };
};

export = strLength;
