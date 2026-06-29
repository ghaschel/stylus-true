import stylus = require("stylus");
import type { StylusPlugin } from "./types/stylus-interop";

const utils = stylus.utils;

interface StylusObject {
  vals: Record<string, unknown>;
}

const mapKeys = function (): StylusPlugin {
  return function (style) {
    style.define("map-keys", function (map: StylusObject) {
      const keys = Object.keys(map.vals);

      return utils.coerce(keys);
    });
  };
};

export = mapKeys;
