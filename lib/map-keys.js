"use strict";
const stylus = require("stylus");
const utils = stylus.utils;
const mapKeys = function () {
    return function (style) {
        style.define("map-keys", function (map) {
            const keys = Object.keys(map.vals);
            return utils.coerce(keys);
        });
    };
};
module.exports = mapKeys;
