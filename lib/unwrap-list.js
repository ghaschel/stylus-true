"use strict";
const stylus = require("stylus");
const utils = stylus.utils;
const unwrapList = function () {
    return function (style) {
        style.define("unwrap-list", function (...args) {
            const unwrapped = args.map((arg) => utils.coerce(arg.val));
            return utils.coerceArray(unwrapped);
        });
    };
};
module.exports = unwrapList;
